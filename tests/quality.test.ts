import { describe, it, expect, vi } from "vitest";
import {
  qualityAssessmentSchema,
  calculateOverallQualityScore,
  determineQualityVerdict,
} from "../apps/api/src/integrations/ai/quality-provider.js";
import {
  enqueueQualityAnalysisJob,
  getLatestQualityAssessmentByAsset,
  getQualityAssessmentHistoryByAsset,
  getReviewEventsByAsset,
  approveAsset,
  requestChangesOnAsset,
  rejectAsset,
} from "../apps/api/src/workers/quality-worker.js";

// Mock Supabase Server Client
vi.mock("../lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-test-qual", email: "director@maisonlumiere.com" } },
        error: null,
      })),
    },
  })),
}));

describe("Quality Scoring Weighted Formula & Verdict Thresholds", () => {
  it("should calculate exact deterministic weighted overall quality score", () => {
    // Scores: Ref 100 (25%), Brand 90 (20%), Prod 90 (20%), Comp 80 (15%), Light 80 (10%), Tech 80 (10%)
    // Weighted = 25 + 18 + 18 + 12 + 8 + 8 = 89
    const scores = {
      referenceSimilarityScore: 100,
      brandConsistencyScore: 90,
      productFidelityScore: 90,
      compositionScore: 80,
      lightingScore: 80,
      technicalQualityScore: 80,
    };

    const overall = calculateOverallQualityScore(scores);
    expect(overall).toBe(89);
  });

  it("should classify PASS for score >= 90", () => {
    expect(determineQualityVerdict(95, 90, 75)).toBe("PASS");
    expect(determineQualityVerdict(90, 90, 75)).toBe("PASS");
  });

  it("should classify REVIEW for 75 <= score < 90", () => {
    expect(determineQualityVerdict(89, 90, 75)).toBe("REVIEW");
    expect(determineQualityVerdict(75, 90, 75)).toBe("REVIEW");
  });

  it("should classify FAIL for score < 75", () => {
    expect(determineQualityVerdict(74, 90, 75)).toBe("FAIL");
    expect(determineQualityVerdict(50, 90, 75)).toBe("FAIL");
  });
});

describe("Zod Quality Output Schema", () => {
  it("should parse valid quality evaluation payload", () => {
    const raw = {
      referenceSimilarityScore: 92,
      brandConsistencyScore: 94,
      productFidelityScore: 90,
      compositionScore: 88,
      lightingScore: 85,
      technicalQualityScore: 96,
      strengths: ["Great lighting"],
      issues: ["Minor shadow noise"],
      recommendations: ["Slightly boost contrast"],
    };

    const parsed = qualityAssessmentSchema.parse(raw);
    expect(parsed.referenceSimilarityScore).toBe(92);
    expect(parsed.strengths).toEqual(["Great lighting"]);
  });

  it("should fail validation for scores out of 0-100 bounds", () => {
    const invalid = {
      referenceSimilarityScore: 150,
      brandConsistencyScore: 94,
      productFidelityScore: 90,
      compositionScore: 88,
      lightingScore: 85,
      technicalQualityScore: 96,
      strengths: [],
      issues: [],
      recommendations: [],
    };

    expect(() => qualityAssessmentSchema.parse(invalid)).toThrow();
  });
});

describe("Quality Worker & Idempotency & History", () => {
  it("should enqueue quality analysis and store assessment result", async () => {
    const assessment = await enqueueQualityAnalysisJob({
      workspaceId: "ws-qual-1",
      campaignId: "camp-qual-1",
      generatedAssetId: "gen-asset-qual-1",
      generatedAssetPath: "generated/asset1.png",
      referenceAssetPath: "ref/ref1.jpg",
      inputAssetPath: "input/inp1.jpg",
      brandName: "Maison Lumière",
      toneVoice: "Editorial",
      campaignName: "Resort 2026",
    });

    expect(assessment.generatedAssetId).toBe("gen-asset-qual-1");
    expect(assessment.status).toBe("COMPLETED");
    expect(assessment.overallScore).toBeGreaterThan(0);
    expect(assessment.verdict).toBeTruthy();

    const latest = getLatestQualityAssessmentByAsset("gen-asset-qual-1");
    expect(latest?.id).toBe(assessment.id);
  });

  it("should preserve quality assessment history across multiple runs for the same asset", async () => {
    await enqueueQualityAnalysisJob({
      workspaceId: "ws-qual-2",
      campaignId: "camp-qual-2",
      generatedAssetId: "gen-asset-hist-1",
      generatedAssetPath: "generated/v1.png",
      referenceAssetPath: "ref/ref1.jpg",
      inputAssetPath: "input/inp1.jpg",
      brandName: "Maison Lumière",
      toneVoice: "Editorial",
      campaignName: "Resort 2026",
    });

    await enqueueQualityAnalysisJob({
      workspaceId: "ws-qual-2",
      campaignId: "camp-qual-2",
      generatedAssetId: "gen-asset-hist-1",
      generatedAssetPath: "generated/v2.png",
      referenceAssetPath: "ref/ref1.jpg",
      inputAssetPath: "input/inp1.jpg",
      brandName: "Maison Lumière",
      toneVoice: "Editorial",
      campaignName: "Resort 2026",
    });

    const history = getQualityAssessmentHistoryByAsset("gen-asset-hist-1");
    expect(history.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Reviewer Decisions & Review Event Logging", () => {
  it("should record APPROVED reviewer decision and log ReviewEvent", () => {
    const approval = approveAsset("gen-asset-rev-1", "user-director");
    expect(approval?.reviewStatus).toBe("APPROVED");

    const events = getReviewEventsByAsset("gen-asset-rev-1");
    const approvedEvt = events.find((e) => e.eventType === "APPROVED");
    expect(approvedEvt).toBeTruthy();
  });

  it("should record CHANGES_REQUESTED with reviewer comment", () => {
    const comment = "Please increase soft lighting on lower skirt margin.";
    const approval = requestChangesOnAsset("gen-asset-rev-2", comment, "user-director");
    expect(approval?.reviewStatus).toBe("CHANGES_REQUESTED");
    expect(approval?.reviewerComment).toBe(comment);

    const events = getReviewEventsByAsset("gen-asset-rev-2");
    const changesEvt = events.find((e) => e.eventType === "CHANGES_REQUESTED");
    expect(changesEvt?.reviewerComment).toBe(comment);
  });

  it("should record REJECTED decision", () => {
    const approval = rejectAsset("gen-asset-rev-3", "user-director");
    expect(approval?.reviewStatus).toBe("REJECTED");

    const events = getReviewEventsByAsset("gen-asset-rev-3");
    const rejectedEvt = events.find((e) => e.eventType === "REJECTED");
    expect(rejectedEvt).toBeTruthy();
  });
});
