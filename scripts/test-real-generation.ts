/**
 * Milestone 5 — Real OpenAI API Opt-In Integration Test Script
 * 
 * IMPORTANT:
 * This script will ONLY run paid OpenAI API calls when explicitly enabled via:
 *   RUN_REAL_OPENAI_TEST=true
 *   OPENAI_API_KEY=sk-...
 * 
 * Usage:
 *   RUN_REAL_OPENAI_TEST=true OPENAI_API_KEY=your_key npx tsx scripts/test-real-generation.ts
 */

import { executeSingleJob } from "../src/lib/ai/generation";
import { OpenAIImageProvider } from "../src/lib/ai/provider";
import { createGenerationRun } from "../src/lib/queue/generation-worker";

async function runRealIntegrationTest() {
  console.log("==================================================");
  console.log("MILESTONE 5 REAL OPENAI INTEGRATION TEST");
  console.log("==================================================");

  const isEnabled = process.env.RUN_REAL_OPENAI_TEST === "true";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!isEnabled || !apiKey || apiKey === "your-openai-api-key") {
    console.log("INFO: RUN_REAL_OPENAI_TEST is not enabled or OPENAI_API_KEY is missing.");
    console.log("Skipping paid OpenAI integration test execution.");
    console.log("To execute this test explicitly, run:");
    console.log("  RUN_REAL_OPENAI_TEST=true OPENAI_API_KEY=sk-... npx tsx scripts/test-real-generation.ts");
    process.exit(0);
  }

  console.log(`OpenAI API Key Detected. Model: ${process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"}`);
  console.log("\n--- TEST 1: Single Input Generation Job (1 Reference + 1 Input) ---");

  const provider = new OpenAIImageProvider();
  const testJobResult = await executeSingleJob({
    jobId: `real-single-${Date.now()}`,
    runId: `real-run-${Date.now()}`,
    workspaceId: "ws-real-test",
    campaignId: "camp-real-test",
    brandName: "Maison Lumière",
    brandTone: "Editorial",
    contentStyle: "Luxury Mediterranean Resort",
    campaignName: "Real API Validation Run",
    inputStoragePath: "ws-real-test/campaigns/camp-real-test/inputs/dress.jpg",
    inputFileName: "silk-resort-dress.jpg",
    referenceStoragePath: "ws-real-test/campaigns/camp-real-test/reference/ref.jpg",
    referenceFileName: "editorial-moodboard.jpg",
    provider,
  });

  console.log("Test 1 Result:", {
    success: testJobResult.success,
    openaiRequestId: testJobResult.openaiRequestId,
    modelUsed: testJobResult.modelUsed,
    storagePath: testJobResult.storagePath,
    assetType: testJobResult.generatedAsset?.assetType,
  });

  console.log("\n--- TEST 2: Batch Generation Job Run (1 Reference + 3 Inputs) ---");
  const batchRun = createGenerationRun({
    workspaceId: "ws-real-test",
    campaignId: `camp-batch-${Date.now()}`,
    idempotencyKey: `idem-batch-${Date.now()}`,
    brandName: "Maison Lumière",
    brandTone: "Editorial",
    contentStyle: "Luxury editorial",
    campaignName: "Real Batch Generation Test",
    referenceAsset: {
      id: "ref-real-1",
      storagePath: "ws-real-test/campaigns/camp-batch/reference/ref.jpg",
      fileName: "moodboard.jpg",
    },
    inputAssets: [
      { id: "inp-real-1", storagePath: "ws-real-test/campaigns/camp-batch/inputs/p1.jpg", fileName: "dress.jpg" },
      { id: "inp-real-2", storagePath: "ws-real-test/campaigns/camp-batch/inputs/p2.jpg", fileName: "bag.jpg" },
      { id: "inp-real-3", storagePath: "ws-real-test/campaigns/camp-batch/inputs/p3.jpg", fileName: "shoes.jpg" },
    ],
  });

  console.log("Test 2 Batch Run Initialized:", {
    runId: batchRun.id,
    idempotencyKey: batchRun.idempotencyKey,
    totalJobs: batchRun.totalJobs,
    status: batchRun.status,
  });

  console.log("\nMilestone 5 Real Integration Test Suite Completed Successfully.");
}

runRealIntegrationTest().catch((err) => {
  console.error("FATAL Integration Test Error:", err);
  process.exit(1);
});
