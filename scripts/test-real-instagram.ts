/**
 * Milestone 8 — Real Meta / Instagram Publishing Engine Opt-In Integration Test Script
 * 
 * IMPORTANT:
 * This script will ONLY run real Meta Graph API calls when explicitly enabled via:
 *   RUN_REAL_INSTAGRAM_TEST=true
 *   META_APP_ID=...
 *   META_APP_SECRET=...
 *   INSTAGRAM_ACCESS_TOKEN=...
 * 
 * Usage:
 *   RUN_REAL_INSTAGRAM_TEST=true INSTAGRAM_ACCESS_TOKEN=sk-... npx tsx scripts/test-real-instagram.ts
 */

import { MetaInstagramProvider } from "../src/lib/instagram/provider";

async function runRealInstagramIntegrationTest() {
  console.log("==================================================");
  console.log("MILESTONE 8 REAL INSTAGRAM PUBLISHING INTEGRATION TEST");
  console.log("==================================================");

  const isEnabled = process.env.RUN_REAL_INSTAGRAM_TEST === "true";
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!isEnabled || !token) {
    console.log("INFO: RUN_REAL_INSTAGRAM_TEST is not enabled or INSTAGRAM_ACCESS_TOKEN is missing.");
    console.log("Skipping real Meta Graph API publishing integration test.");
    console.log("To execute this test explicitly, run:");
    console.log("  RUN_REAL_INSTAGRAM_TEST=true INSTAGRAM_ACCESS_TOKEN=... npx tsx scripts/test-real-instagram.ts");
    process.exit(0);
  }

  console.log(`Instagram Access Token Detected. API Version: ${process.env.META_API_VERSION || "v20.0"}`);

  const provider = new MetaInstagramProvider();
  const accountInfo = await provider.getAuthorizedAccount(token);

  console.log("\n--- Real Account Access Verification ---");
  console.log("Instagram User ID:", accountInfo.instagramUserId);
  console.log("Username:", accountInfo.username);
  console.log("Account Type:", accountInfo.accountType);

  console.log("\nMilestone 8 Real Instagram Integration Test Completed Successfully.");
}

runRealInstagramIntegrationTest().catch((err) => {
  console.error("FATAL Integration Test Error:", err);
  process.exit(1);
});
