import { enqueueInstagramPublishJob } from "./instagram-worker.js";
import { processDueScheduledPublications } from "./instagram-scheduler-worker.js";

console.log("[Publishing Worker Cluster] Listening for social media publishing & scheduling jobs...");

export function runPublishingWorkerCluster() {
  console.log("[Publishing Worker Cluster] Worker initialized successfully.");
}

if (process.env.NODE_ENV !== "test") {
  runPublishingWorkerCluster();
}
