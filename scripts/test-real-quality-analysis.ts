/**
 * Milestone 7 — Real OpenAI Image Quality Analysis Engine Opt-In Integration Test Script
 * 
 * IMPORTANT:
 * This script will ONLY run paid OpenAI Vision API calls when explicitly enabled via:
 *   RUN_REAL_OPENAI_TEST=true
 *   OPENAI_API_KEY=sk-...
 * 
 * Usage:
 *   RUN_REAL_OPENAI_TEST=true OPENAI_API_KEY=your_key npx tsx scripts/test-real-quality-analysis.ts
 */

import { OpenAIImageQualityProvider } from "../src/lib/ai/quality-provider";

async function runRealQualityIntegrationTest() {
  console.log("==================================================");
  console.log("MILESTONE 7 REAL OPENAI QUALITY ANALYSIS INTEGRATION TEST");
  console.log("==================================================");

  const isEnabled = process.env.RUN_REAL_OPENAI_TEST === "true";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!isEnabled || !apiKey || apiKey === "your-openai-api-key") {
    console.log("INFO: RUN_REAL_OPENAI_TEST is not enabled or OPENAI_API_KEY is missing.");
    console.log("Skipping paid OpenAI image quality analysis integration test.");
    console.log("To execute this test explicitly, run:");
    console.log("  RUN_REAL_OPENAI_TEST=true OPENAI_API_KEY=sk-... npx tsx scripts/test-real-quality-analysis.ts");
    process.exit(0);
  }

  console.log(`OpenAI API Key Detected. Vision Model: ${process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"}`);

  const provider = new OpenAIImageQualityProvider();
  const qualityResult = await provider.analyzeImageQuality({
    generatedAssetPath: "generated/haute-couture-dress.png",
    referenceAssetPath: "reference/resort-moodboard.jpg",
    inputAssetPath: "input/silk-dress-01.jpg",
    brandName: "Maison Lumière",
    toneVoice: "Editorial",
    contentStyle: "Haute couture resort fashion",
    campaignName: "Mediterranean Resort 2026",
  });

  console.log("\n--- Real Quality Scoring & Zod Validation Result ---");
  console.log("Overall Score:", qualityResult.overallScore, "/ 100");
  console.log("Verdict:", qualityResult.verdict);
  console.log("Reference Similarity:", qualityResult.referenceSimilarityScore);
  console.log("Brand Consistency:", qualityResult.brandConsistencyScore);
  console.log("Product Fidelity:", qualityResult.productFidelityScore);
  console.log("Composition:", qualityResult.compositionScore);
  console.log("Lighting:", qualityResult.lightingScore);
  console.log("Technical Quality:", qualityResult.technicalQualityScore);
  console.log("Strengths:", qualityResult.strengths);
  console.log("Issues:", qualityResult.issues);
  console.log("Recommendations:", qualityResult.recommendations);
  console.log("Provider Request ID:", qualityResult.providerRequestId);

  console.log("\nMilestone 7 Real Quality Analysis Test Completed Successfully.");
}

runRealQualityIntegrationTest().catch((err) => {
  console.error("FATAL Integration Test Error:", err);
  process.exit(1);
});
