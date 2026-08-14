import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const generationQueue = new Queue("generation-queue", {
  connection: {
    url: redisUrl,
  },
});
