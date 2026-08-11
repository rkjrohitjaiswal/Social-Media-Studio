/**
 * Milestone 9 — Real Content Calendar & Scheduler Opt-In Integration Test Script
 * 
 * IMPORTANT:
 * This script will ONLY run real Meta Graph API scheduling calls when explicitly enabled via:
 *   RUN_REAL_SCHEDULING_TEST=true
 *   INSTAGRAM_ACCESS_TOKEN=sk-...
 * 
 * Usage:
 *   RUN_REAL_SCHEDULING_TEST=true INSTAGRAM_ACCESS_TOKEN=sk-... npx tsx scripts/test-real-scheduling.ts
 */

import { processDueScheduledPublications, createScheduledPublication } from "../src/lib/queue/instagram-scheduler-worker";
import { connectInstagramAccount } from "../src/lib/queue/instagram-worker";

async function runRealSchedulingIntegrationTest() {
  console.log("==================================================");
  console.log("MILESTONE 9 REAL SCHEDULING INTEGRATION TEST");
  console.log("==================================================");

  const isEnabled = process.env.RUN_REAL_SCHEDULING_TEST === "true";
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!isEnabled || !token) {
    console.log("INFO: RUN_REAL_SCHEDULING_TEST is not enabled or INSTAGRAM_ACCESS_TOKEN is missing.");
    console.log("Skipping real Instagram scheduled publishing integration test.");
    console.log("To execute this test explicitly, run:");
    console.log("  RUN_REAL_SCHEDULING_TEST=true INSTAGRAM_ACCESS_TOKEN=... npx tsx scripts/test-real-scheduling.ts");
    process.exit(0);
  }

  connectInstagramAccount({
    workspaceId: "ws-real-sched",
    instagramUserId: "ig-user-real",
    username: "maisonlumiere_official",
    rawAccessToken: token,
  });

  const futureTime = new Date(Date.now() + 5000).toISOString();
  const schedule = await createScheduledPublication({
    workspaceId: "ws-real-sched",
    campaignId: "camp-real-sched",
    generatedAssetId: "asset-real-sched",
    socialCopyId: "copy-real-sched",
    instagramAccountId: "acc-real-sched",
    scheduledFor: futureTime,
    timezone: "UTC",
    caption: "Real Instagram Schedule Integration Test",
    hashtags: ["test", "maisonlumiere"],
    cta: "Discover the edit.",
    approvalStatus: "APPROVED",
    imageStatus: "COMPLETED",
    copyStatus: "COMPLETED",
    qualityStatus: "COMPLETED",
  });

  console.log("\n--- Schedule Created ---");
  console.log("Schedule ID:", schedule.id);
  console.log("Scheduled UTC:", schedule.scheduledFor);

  console.log("\nWaiting 6 seconds for schedule due time...");
  await new Promise((r) => setTimeout(r, 6000));

  const processed = await processDueScheduledPublications();
  console.log("Processed Due Items:", processed.length);

  console.log("\nMilestone 9 Real Scheduling Integration Test Completed Successfully.");
}

runRealSchedulingIntegrationTest().catch((err) => {
  console.error("FATAL Integration Test Error:", err);
  process.exit(1);
});
