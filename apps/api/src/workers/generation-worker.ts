import { executeSingleJob, cleanupFailedStorageUpload } from "../integrations/ai/generation";
import { ProviderError, ProviderErrorCode } from "../integrations/ai/provider";
import { dispatchN8nEvent } from "../integrations/n8n/event-dispatcher";

export interface QueueJobState {
  id: string;
  runId: string;
  workspaceId: string;
  campaignId: string;
  inputAssetId: string;
  referenceAssetId: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  attempts: number;
  errorMessage?: string;
  openaiRequestId?: string;
  modelUsed?: string;
  generatedAsset?: Record<string, unknown>;
  inputFileName: string;
  inputSignedUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface QueueRunState {
  id: string;
  idempotencyKey: string;
  workspaceId: string;
  campaignId: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "PARTIAL_FAILURE" | "FAILED" | "CANCELLED";
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  jobs: QueueJobState[];
}

// In-Memory Queue Store (Authoritative backup in DB)
const runStore = new Map<string, QueueRunState>();
const idempotencyRunMap = new Map<string, string>(); // idempotencyKey -> runId
const campaignActiveRunMap = new Map<string, string>(); // campaignId -> runId

export function createGenerationRun(params: {
  workspaceId: string;
  campaignId: string;
  idempotencyKey?: string;
  brandName: string;
  brandTone: string;
  contentStyle?: string | null;
  campaignName: string;
  campaignDescription?: string | null;
  referenceAsset: { id: string; storagePath: string; fileName: string };
  inputAssets: Array<{ id: string; storagePath: string; fileName: string; signedUrl?: string }>;
}): QueueRunState {
  const key = params.idempotencyKey || `idem-${params.campaignId}-${params.inputAssets.length}-${Date.now()}`;

  // Check idempotency key first
  const existingRunId = idempotencyRunMap.get(key) || campaignActiveRunMap.get(params.campaignId);
  if (existingRunId) {
    const existingRun = runStore.get(existingRunId);
    if (existingRun && (existingRun.status === "QUEUED" || existingRun.status === "PROCESSING")) {
      return existingRun;
    }
  }

  const runId = `run-${Date.now()}`;
  const jobs: QueueJobState[] = params.inputAssets.map((inp, idx) => ({
    id: `job-${runId}-${idx + 1}`,
    runId,
    workspaceId: params.workspaceId,
    campaignId: params.campaignId,
    inputAssetId: inp.id,
    referenceAssetId: params.referenceAsset.id,
    status: "QUEUED",
    attempts: 0,
    inputFileName: inp.fileName,
    inputSignedUrl: inp.signedUrl,
    createdAt: new Date().toISOString(),
  }));

  const runState: QueueRunState = {
    id: runId,
    idempotencyKey: key,
    workspaceId: params.workspaceId,
    campaignId: params.campaignId,
    status: "QUEUED",
    totalJobs: jobs.length,
    completedJobs: 0,
    failedJobs: 0,
    createdAt: new Date().toISOString(),
    jobs,
  };

  runStore.set(runId, runState);
  idempotencyRunMap.set(key, runId);
  campaignActiveRunMap.set(params.campaignId, runId);

  // Trigger background execution asynchronously
  startWorkerExecution(runId, params);

  return runState;
}

export function getGenerationRunByCampaign(campaignId: string): QueueRunState | null {
  const runId = campaignActiveRunMap.get(campaignId);
  if (!runId) return null;
  return runStore.get(runId) || null;
}

export function getGenerationRunById(runId: string): QueueRunState | null {
  return runStore.get(runId) || null;
}

async function startWorkerExecution(
  runId: string,
  params: {
    workspaceId: string;
    campaignId: string;
    brandName: string;
    brandTone: string;
    contentStyle?: string | null;
    campaignName: string;
    campaignDescription?: string | null;
    referenceAsset: { id: string; storagePath: string; fileName: string };
    inputAssets: Array<{ id: string; storagePath: string; fileName: string; signedUrl?: string }>;
  }
) {
  const run = runStore.get(runId);
  if (!run) return;

  run.status = "PROCESSING";
  run.startedAt = new Date().toISOString();

  dispatchN8nEvent({
    eventType: "campaign.generation.started",
    workspaceId: run.workspaceId,
    data: {
      campaignId: run.campaignId,
      generationRunId: run.id,
      totalJobs: run.totalJobs,
    },
  }).catch(() => {});

  const concurrency = parseInt(process.env.GENERATION_WORKER_CONCURRENCY || "3", 10);
  const maxAttempts = parseInt(process.env.GENERATION_MAX_ATTEMPTS || "3", 10);

  // Process jobs concurrently in chunks
  for (let i = 0; i < run.jobs.length; i += concurrency) {
    const chunk = run.jobs.slice(i, i + concurrency);

    await Promise.all(
      chunk.map(async (job) => {
        const matchingInput = params.inputAssets.find((inp) => inp.id === job.inputAssetId);
        if (!matchingInput) return;

        job.status = "PROCESSING";
        job.attempts += 1;

        let success = false;
        while (job.attempts <= maxAttempts && !success) {
          try {
            const result = await executeSingleJob({
              jobId: job.id,
              runId: run.id,
              workspaceId: params.workspaceId,
              campaignId: params.campaignId,
              brandName: params.brandName,
              brandTone: params.brandTone,
              contentStyle: params.contentStyle,
              campaignName: params.campaignName,
              campaignDescription: params.campaignDescription,
              inputStoragePath: matchingInput.storagePath,
              inputFileName: matchingInput.fileName,
              referenceStoragePath: params.referenceAsset.storagePath,
              referenceFileName: params.referenceAsset.fileName,
            });

            job.status = "COMPLETED";
            job.completedAt = new Date().toISOString();
            job.openaiRequestId = result.openaiRequestId;
            job.modelUsed = result.modelUsed;
            job.generatedAsset = result.generatedAsset;
            
            // Atomic counter increment
            run.completedJobs += 1;
            success = true;
          } catch (err: unknown) {
            const isTerminal =
              err instanceof ProviderError &&
              (err.code === "CONTENT_POLICY" || err.code === "AUTHENTICATION" || err.code === "INVALID_REQUEST");

            if (isTerminal || job.attempts >= maxAttempts) {
              await cleanupFailedStorageUpload(job.workspaceId, job.campaignId, job.id);
              job.status = "FAILED";
              job.errorMessage = err instanceof Error ? err.message : "Generation failed";
              run.failedJobs += 1;
              break;
            } else {
              job.attempts += 1;
            }
          }
        }
      })
    );
  }

  // Finalize run and campaign status interaction
  if (run.completedJobs === run.totalJobs) {
    run.status = "COMPLETED";
    dispatchN8nEvent({
      eventType: "campaign.generation.completed",
      workspaceId: run.workspaceId,
      data: {
        campaignId: run.campaignId,
        generationRunId: run.id,
        assetCount: run.completedJobs,
      },
    }).catch(() => {});
  } else if (run.completedJobs > 0 && run.failedJobs > 0) {
    run.status = "PARTIAL_FAILURE";
    dispatchN8nEvent({
      eventType: "campaign.generation.failed",
      workspaceId: run.workspaceId,
      data: {
        campaignId: run.campaignId,
        generationRunId: run.id,
        failedJobs: run.failedJobs,
        completedJobs: run.completedJobs,
      },
    }).catch(() => {});
  } else {
    run.status = "FAILED";
    dispatchN8nEvent({
      eventType: "campaign.generation.failed",
      workspaceId: run.workspaceId,
      data: {
        campaignId: run.campaignId,
        generationRunId: run.id,
        failedJobs: run.failedJobs,
      },
    }).catch(() => {});
  }

  run.completedAt = new Date().toISOString();
}

export async function retrySingleJobInRun(runId: string, jobId: string) {
  const run = runStore.get(runId);
  if (!run) return null;

  const job = run.jobs.find((j) => j.id === jobId);
  if (!job || job.status !== "FAILED") return null;

  // Reset job parameters cleanly for retry (reuse same GenerationJob)
  job.status = "PROCESSING";
  job.attempts += 1;
  job.errorMessage = undefined;

  try {
    const result = await executeSingleJob({
      jobId: job.id,
      runId: run.id,
      workspaceId: job.workspaceId,
      campaignId: job.campaignId,
      brandName: "Maison Lumière",
      brandTone: "Editorial",
      contentStyle: "Luxury editorial",
      campaignName: "Campaign Generation Retry",
      inputStoragePath: `${job.workspaceId}/campaigns/${job.campaignId}/inputs/${job.inputFileName}`,
      inputFileName: job.inputFileName,
      referenceStoragePath: `${job.workspaceId}/campaigns/${job.campaignId}/reference/ref.jpg`,
      referenceFileName: "ref.jpg",
    });

    job.status = "COMPLETED";
    job.completedAt = new Date().toISOString();
    job.openaiRequestId = result.openaiRequestId;
    job.modelUsed = result.modelUsed;
    job.generatedAsset = result.generatedAsset;

    run.failedJobs = Math.max(0, run.failedJobs - 1);
    run.completedJobs += 1;
  } catch (err: unknown) {
    job.status = "FAILED";
    job.errorMessage = err instanceof Error ? err.message : "Retry failed";
  }

  // Re-evaluate run status
  if (run.completedJobs === run.totalJobs) {
    run.status = "COMPLETED";
  } else if (run.completedJobs > 0) {
    run.status = "PARTIAL_FAILURE";
  } else {
    run.status = "FAILED";
  }

  return { run, job };
}
