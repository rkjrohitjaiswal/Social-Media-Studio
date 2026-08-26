/**
 * Phase 2F Part 1 — Background Publishing Worker Tests
 *
 * Requirements tested:
 *   1. Worker starts and tracks active state
 *   2. Configured interval is respected via env var or parameter
 *   3. Due posts invoke executeDueScheduledPosts()
 *   4. Overlapping executions are prevented via in-process lock
 *   5. Worker catches execution errors without crashing and continues
 *   6. Worker can be stopped cleanly for test isolation
 *   7. Singleton startup prevents duplicate execution loops
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  startPublishingWorker,
  stopPublishingWorker,
  tickPublishingWorker,
  isPublishingWorkerActive,
  isPublishingWorkerExecuting,
  getWorkerIntervalMs,
  getPublishingWorkerMetrics,
  resetWorkerStats,
} from "../apps/api/src/workers/publishing-worker";
import * as publishingService from "../apps/api/src/services/publishing-service";

describe("Phase 2F Part 1 — Background Publishing Worker", () => {
  const originalEnv = process.env.PUBLISHING_WORKER_INTERVAL_MS;

  beforeEach(() => {
    stopPublishingWorker();
    resetWorkerStats();
    process.env.PUBLISHING_WORKER_INTERVAL_MS = originalEnv;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    stopPublishingWorker();
    resetWorkerStats();
    process.env.PUBLISHING_WORKER_INTERVAL_MS = originalEnv;
    vi.restoreAllMocks();
  });

  // ── 1. Worker Startup & Active State ───────────────────────────────────────

  it("1. starts worker background ticker and reports active state", () => {
    expect(isPublishingWorkerActive()).toBe(false);
    const started = startPublishingWorker(10000);
    expect(started).toBe(true);
    expect(isPublishingWorkerActive()).toBe(true);
  });

  // ── 2. Interval Configuration ───────────────────────────────────────────────

  it("2. respects configured interval from env var or default 60000ms", () => {
    delete process.env.PUBLISHING_WORKER_INTERVAL_MS;
    expect(getWorkerIntervalMs()).toBe(60000);

    process.env.PUBLISHING_WORKER_INTERVAL_MS = "15000";
    expect(getWorkerIntervalMs()).toBe(15000);

    process.env.PUBLISHING_WORKER_INTERVAL_MS = "invalid";
    expect(getWorkerIntervalMs()).toBe(60000);
  });

  // ── 3. Due Post Execution ───────────────────────────────────────────────────

  it("3. due posts invoke executeDueScheduledPosts() during tick", async () => {
    const mockSummary = {
      processed: 2,
      publishedCount: 2,
      failedCount: 0,
      skippedCount: 0,
      results: [
        { scheduledPostId: "sp-1", status: "PUBLISHED", publishedPostId: "pub-1" },
        { scheduledPostId: "sp-2", status: "PUBLISHED", publishedPostId: "pub-2" },
      ],
    };

    const spy = vi
      .spyOn(publishingService, "executeDueScheduledPosts")
      .mockResolvedValue(mockSummary as any);

    const summary = await tickPublishingWorker();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(summary?.publishedCount).toBe(2);

    const metrics = getPublishingWorkerMetrics();
    expect(metrics.executionCount).toBe(1);
    expect(metrics.lastExecutionSummary).toEqual(mockSummary);
  });

  // ── 4. Overlap Protection ───────────────────────────────────────────────────

  it("4. prevents overlapping executions when previous tick is in progress", async () => {
    let resolveFirstTick: (value: any) => void;
    const longRunningPromise = new Promise((resolve) => {
      resolveFirstTick = resolve;
    });

    vi.spyOn(publishingService, "executeDueScheduledPosts").mockImplementation(() => longRunningPromise as any);

    // Launch first tick (which hangs on longRunningPromise)
    const tick1Promise = tickPublishingWorker();

    expect(isPublishingWorkerExecuting()).toBe(true);

    // Attempt second tick while first tick is still running
    const tick2Result = await tickPublishingWorker();

    // Second tick must be skipped immediately and return null
    expect(tick2Result).toBeNull();

    // Resolve first tick
    resolveFirstTick!({ processed: 1, publishedCount: 1, failedCount: 0, skippedCount: 0, results: [] });
    await tick1Promise;

    expect(isPublishingWorkerExecuting()).toBe(false);
  });

  // ── 5. Error Isolation ──────────────────────────────────────────────────────

  it("5. catches execution errors without crashing worker and continues", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.spyOn(publishingService, "executeDueScheduledPosts").mockRejectedValue(
      new Error("Database connection timeout")
    );

    const result = await tickPublishingWorker();

    expect(result).toBeNull();
    expect(isPublishingWorkerExecuting()).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  // ── 6. Worker Cleanup & Stop ───────────────────────────────────────────────

  it("6. worker can be stopped and cleaned up cleanly", () => {
    startPublishingWorker(5000);
    expect(isPublishingWorkerActive()).toBe(true);

    stopPublishingWorker();
    expect(isPublishingWorkerActive()).toBe(false);
  });

  // ── 7. Singleton Startup ────────────────────────────────────────────────────

  it("7. singleton startup prevents creating duplicate worker loops", () => {
    const firstStart = startPublishingWorker(5000);
    expect(firstStart).toBe(true);

    // Second start call while worker is already running must return false
    const secondStart = startPublishingWorker(5000);
    expect(secondStart).toBe(false);
    expect(isPublishingWorkerActive()).toBe(true);
  });
});
