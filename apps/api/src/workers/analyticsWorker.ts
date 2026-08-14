import { getAnalyticsOverview } from "./instagram-analytics-worker.js";

console.log("[Analytics Worker Cluster] Listening for social performance analytics jobs...");

export function runAnalyticsWorkerCluster() {
  console.log("[Analytics Worker Cluster] Worker initialized successfully.");
}

if (process.env.NODE_ENV !== "test") {
  runAnalyticsWorkerCluster();
}
