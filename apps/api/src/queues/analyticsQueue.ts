import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const analyticsQueue = new Queue("analytics-queue", {
  connection: {
    url: redisUrl,
  },
});
