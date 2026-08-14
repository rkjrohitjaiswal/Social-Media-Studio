import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const publishingQueue = new Queue("publishing-queue", {
  connection: {
    url: redisUrl,
  },
});
