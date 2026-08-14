import { createGenerationRun } from "./generation-worker.js";
import { enqueueSocialCopyJob } from "./social-copy-worker.js";
import { enqueueQualityAnalysisJob } from "./quality-worker.js";

console.log("[Generation Worker Cluster] Listening for image generation, social copy, and quality assessment jobs...");

export function runGenerationWorkerCluster() {
  console.log("[Generation Worker Cluster] Worker initialized successfully.");
}

if (process.env.NODE_ENV !== "test") {
  runGenerationWorkerCluster();
}
