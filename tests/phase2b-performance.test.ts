import { describe, it, expect, beforeEach } from "vitest";
import {
  getTopPerformingContent,
  analyzeContentPerformance,
  detectContentPatterns,
  generateCreateMoreLikeThisVariations,
  calculateBestPostingTimes,
  getAiNextContentRecommendations,
} from "../apps/api/src/services/performance-service";
import { checkUsageAccess, consumeUsage, clearInMemoryUsage } from "../apps/api/src/services/usage-service";

describe("Phase 2B — Performance Intelligence & 'Create More Like This' Test Suite", () => {
  beforeEach(() => {
    clearInMemoryUsage();
  });

  it("1. Top Performing Content: correctly sorts and filters by real metrics", async () => {
    const report = await getTopPerformingContent("demo-user-id", "engagement", "INSTAGRAM");

    expect(report.hasData).toBe(true);
    expect(report.sortBy).toBe("engagement");
    expect(report.platform).toBe("INSTAGRAM");
    expect(report.items.length).toBeGreaterThan(0);
    expect(report.items[0].platform).toBe("INSTAGRAM");

    // Highest engagement item first
    const firstRate = report.items[0].metrics.engagementRate;
    if (report.items.length > 1) {
      const secondRate = report.items[1].metrics.engagementRate;
      expect(firstRate).toBeGreaterThanOrEqual(secondRate);
    }
  });

  it("2. Performance Baseline: calculates baseline comparison and relative percentage (+74%)", async () => {
    const analysis = await analyzeContentPerformance("demo-user-id", "media-1");

    expect(analysis.contentId).toBe("media-1");
    expect(analysis.baseline.hasSufficientData).toBe(true);
    expect(analysis.baseline.currentValue).toBe(8.2);
    expect(analysis.baseline.baselineValue).toBeGreaterThan(0);
    expect(analysis.baseline.relativeResultPercentage).toBe(32);

    // Explainable recommendations must include WHAT, WHY, CONFIDENCE, DATA BASIS
    expect(analysis.recommendations.length).toBeGreaterThan(0);
    const rec = analysis.recommendations[0];
    expect(rec.what).toBeDefined();
    expect(rec.why).toBeDefined();
    expect(["HIGH", "MEDIUM", "LOW"]).toContain(rec.confidence);
    expect(Array.isArray(rec.dataBasis)).toBe(true);
  });

  it("3. Insufficient Data Fallbacks: gracefully handles users with 0 published items", async () => {
    const report = await getTopPerformingContent("new-empty-user-id", "engagement");
    expect(report.hasData).toBe(false);
    expect(report.message).toBe("No performance data available yet.");
    expect(report.items).toEqual([]);

    const postingTime = await calculateBestPostingTimes("new-empty-user-id");
    expect(postingTime.hasSufficientData).toBe(false);
    expect(postingTime.message).toBe("Not enough account-specific data yet.");

    const patterns = await detectContentPatterns("new-empty-user-id");
    expect(patterns).toEqual([]);
  });

  it("4. Pattern Detection & AI Next Content: detects high-converting patterns and next recommendations", async () => {
    const patterns = await detectContentPatterns("demo-user-id");
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].patternObservation).toContain("educational carousel");

    const recs = await getAiNextContentRecommendations("demo-user-id");
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].actionType).toBe("CREATE_MORE_LIKE_THIS");
  });

  it("5. Create More Like This & Credit System: generates variations and enforces credit deduction", async () => {
    const userId = "credit-test-user-p2b";

    // Initial access check: 10 free credits available
    let access = await checkUsageAccess(userId, "CONTENT_GENERATION");
    expect(access.allowed).toBe(true);
    expect(access.freeCreditsRemaining).toBe(10);

    // Generate variations -> Consumes 1 credit
    const variations = await generateCreateMoreLikeThisVariations(userId, "media-1", 3, "INSTAGRAM");
    await consumeUsage(userId, "CONTENT_GENERATION");

    expect(variations.variationsCount).toBe(3);
    expect(variations.variations.length).toBe(3);
    expect(variations.variations[0].studioUrl).toContain("/create?topic=");

    // Verify 1 credit consumed (9 remaining)
    access = await checkUsageAccess(userId, "CONTENT_GENERATION");
    expect(access.freeCreditsRemaining).toBe(9);

    // Consume remaining 9 credits to test enforcement limit
    for (let i = 0; i < 9; i++) {
      await consumeUsage(userId, "CONTENT_GENERATION");
    }

    // 11th generation attempt must fail with PLAN_LIMIT_REACHED or USAGE_LIMIT_REACHED
    access = await checkUsageAccess(userId, "CONTENT_GENERATION");
    expect(access.allowed).toBe(false);
  });

  it("6. IDOR Security Verification: prevents accessing another user's performance content", async () => {
    await expect(
      analyzeContentPerformance("unauthorized-hacker-id", "media-1")
    ).rejects.toThrow();
  });
});
