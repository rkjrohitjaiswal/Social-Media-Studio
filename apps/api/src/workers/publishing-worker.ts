import { executeDueScheduledPosts, PublishingExecutionSummary } from "../services/publishing-service.js";

let timerId: NodeJS.Timeout | null = null;
let isExecuting = false;
let isStarted = false;
let executionCount = 0;
let lastExecutionSummary: PublishingExecutionSummary | null = null;

export function getWorkerIntervalMs(): number {
  const envVal = process.env.PUBLISHING_WORKER_INTERVAL_MS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 60000;
}

export function isPublishingWorkerActive(): boolean {
  return isStarted && timerId !== null;
}

export function isPublishingWorkerExecuting(): boolean {
  return isExecuting;
}

export function getPublishingWorkerMetrics() {
  return {
    isStarted,
    isExecuting,
    executionCount,
    lastExecutionSummary,
  };
}

export function resetWorkerStats() {
  executionCount = 0;
  lastExecutionSummary = null;
}

/**
 * Triggers a single tick of the publishing worker manually or on interval schedule.
 * Non-overlapping: If a tick is already executing, skips to prevent concurrent race conditions.
 * Non-blocking & Error Isolated: Catch and log execution errors without crashing process.
 */
export async function tickPublishingWorker(): Promise<PublishingExecutionSummary | null> {
  if (isExecuting) {
    return null;
  }

  isExecuting = true;
  executionCount++;

  try {
    const summary = await executeDueScheduledPosts();
    lastExecutionSummary = summary;
    if (summary.publishedCount > 0) {
      console.log(
        `[Publishing Worker] Executed ${summary.publishedCount} due scheduled post(s)`
      );
    }
    return summary;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Publishing Worker] Execution error during tick: ${msg}`);
    return null;
  } finally {
    isExecuting = false;
  }
}

/**
 * Starts the publishing worker singleton ticker.
 * Guaranteed to start exactly once even if called multiple times.
 */
export function startPublishingWorker(customIntervalMs?: number): boolean {
  if (isStarted && timerId !== null) {
    return false;
  }

  isStarted = true;
  const intervalMs = customIntervalMs || getWorkerIntervalMs();

  setImmediate(() => {
    tickPublishingWorker().catch(() => {});
  });

  timerId = setInterval(() => {
    tickPublishingWorker().catch(() => {});
  }, intervalMs);

  console.log(`[Publishing Worker] Started background ticker (interval: ${intervalMs}ms)`);
  return true;
}

/**
 * Stops and cleans up the publishing worker ticker.
 * Essential for test isolation and graceful shutdown.
 */
export function stopPublishingWorker(): void {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  isStarted = false;
  isExecuting = false;
}
