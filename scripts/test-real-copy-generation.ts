/**
 * Milestone 6 — Real OpenAI Social Copy Engine Opt-In Integration Test Script
 * 
 * IMPORTANT:
 * This script will ONLY run paid OpenAI API calls when explicitly enabled via:
 *   RUN_REAL_OPENAI_TEST=true
 *   OPENAI_API_KEY=sk-...
 * 
 * Usage:
 *   RUN_REAL_OPENAI_TEST=true OPENAI_API_KEY=your_key npx tsx scripts/test-real-copy-generation.ts
 */

import { OpenAITextProvider } from "../src/lib/ai/text-provider";

async function runRealCopyIntegrationTest() {
  console.log("==================================================");
  console.log("MILESTONE 6 REAL OPENAI COPY ENGINE INTEGRATION TEST");
  console.log("==================================================");

  const isEnabled = process.env.RUN_REAL_OPENAI_TEST === "true";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!isEnabled || !apiKey || apiKey === "your-openai-api-key") {
    console.log("INFO: RUN_REAL_OPENAI_TEST is not enabled or OPENAI_API_KEY is missing.");
    console.log("Skipping paid OpenAI text generation integration test.");
    console.log("To execute this test explicitly, run:");
    console.log("  RUN_REAL_OPENAI_TEST=true OPENAI_API_KEY=sk-... npx tsx scripts/test-real-copy-generation.ts");
    process.exit(0);
  }

  console.log(`OpenAI Text API Key Detected. Model: ${process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini"}`);

  const provider = new OpenAITextProvider();
  const copyResult = await provider.generateSocialCopy({
    brandName: "Maison Lumière",
    brandDescription: "Luxury Mediterranean resort fashion house",
    toneVoice: "Editorial",
    contentStyle: "Haute couture resort fashion",
    targetAudience: "High-end luxury fashion connoisseurs",
    defaultCta: "Discover the Mediterranean story.",
    guidelines: "Use sophisticated, evocative, refined luxury language.",
    campaignName: "Mediterranean Resort 2026",
    campaignDescription: "Summer Haute Couture collection",
    inputFileName: "silk-resort-gown.jpg",
  });

  console.log("\n--- Real Text Generation & Zod Validation Result ---");
  console.log("Caption:", copyResult.caption);
  console.log("Hashtags:", copyResult.hashtags);
  console.log("CTA:", copyResult.cta);
  console.log("Alt Text:", copyResult.altText);
  console.log("Model Used:", copyResult.model);
  console.log("Provider Request ID:", copyResult.providerRequestId);

  console.log("\nMilestone 6 Real Copy Integration Test Completed Successfully.");
}

runRealCopyIntegrationTest().catch((err) => {
  console.error("FATAL Integration Test Error:", err);
  process.exit(1);
});
