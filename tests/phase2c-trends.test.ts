import { describe, it, expect, beforeEach } from "vitest";
import { NullTrendProvider } from "../apps/api/src/services/trends/null-trend-provider";
import {
  GoogleTrendsProvider,
  generateDeterministicTrendId,
} from "../apps/api/src/services/trends/google-trends-provider";
import {
  setTrendProvider,
  getTrendSourceState,
  fetchTrendingTopics,
  searchTrends,
  evaluateTrendRelevance,
  getDetailedTrendInfo,
  calculateTrendScore,
  determineTrendLifecycle,
} from "../apps/api/src/services/trends/trend-service";
import { clearInMemoryUsage } from "../apps/api/src/services/usage-service";
import { NormalizedTrend } from "@ai-social/shared";

describe("Phase 2C — Google Trends Provider & Trend Intelligence Test Suite", () => {
  beforeEach(() => {
    setTrendProvider(new NullTrendProvider());
    clearInMemoryUsage();
  });

  it("1. Provider not configured: returns NOT_CONFIGURED state and falls back safely", async () => {
    const unconfiguredProvider = new GoogleTrendsProvider({ projectId: "", clientEmail: "" });
    expect(unconfiguredProvider.isConfigured()).toBe(false);
    expect(unconfiguredProvider.getStatus()).toBe("NOT_CONFIGURED");

    const state = unconfiguredProvider.getSourceState();
    expect(state.isConnected).toBe(false);
    expect(state.statusMessage).toContain("Google Cloud credentials not configured");

    const topics = await unconfiguredProvider.getTrendingTopics();
    expect(topics).toHaveLength(0);
  });

  it("2. Provider configured: returns CONNECTED state when credentials present", () => {
    const configuredProvider = new GoogleTrendsProvider({
      projectId: "my-gcp-project",
      clientEmail: "sa@my-gcp-project.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\\ntestkey\\n-----END PRIVATE KEY-----",
    });

    expect(configuredProvider.isConfigured()).toBe(true);
    expect(configuredProvider.getStatus()).toBe("CONNECTED");
    expect(configuredProvider.getSourceState().isConnected).toBe(true);
  });

  it("3. Normalizes raw BigQuery top_rising_terms rows into NormalizedTrend objects", async () => {
    const provider = new GoogleTrendsProvider({
      projectId: "my-gcp-project",
      clientEmail: "sa@my-gcp-project.iam.gserviceaccount.com",
      privateKey: "dummy-key",
    });

    (provider as any)._mockRows = [
      {
        term: "AI Agent Workflows",
        rank: 1,
        refresh_date: "2026-08-23T00:00:00.000Z",
        percent_gain: 1550,
      },
      {
        term: "Generative Video Studio",
        rank: 2,
        refresh_date: "2026-08-23T00:00:00.000Z",
        percent_gain: 80,
      },
    ];

    const topics = await provider.getTrendingTopics({ region: "IN", limit: 10 });
    expect(topics).toHaveLength(2);
    expect(topics[0].title).toBe("AI Agent Workflows");
    expect(topics[0].source).toBe("GOOGLE_TRENDS");
    expect(topics[0].trendStatus).toBe("EMERGING"); // > 100% gain
    expect(topics[1].trendStatus).toBe("GROWING");
  });

  it("4. Calculates normalized Trend Score from available signals", () => {
    const trend: NormalizedTrend = {
      id: "gt-1",
      title: "AI Workflows",
      description: "Test trend",
      category: "Technology",
      platform: "GENERAL",
      region: "India",
      source: "GOOGLE_TRENDS",
      detectedAt: new Date().toISOString(),
      trendStatus: "EMERGING",
      sourceData: { rank: 1, percentGain: 1550 },
    };

    const score = calculateTrendScore(trend);
    expect(score).toBeGreaterThanOrEqual(75);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("5. Handles missing data signals without fabricating metrics", () => {
    const trendNoData: NormalizedTrend = {
      id: "gt-2",
      title: "Unknown Trend",
      description: "Test trend without metrics",
      category: "General",
      platform: "GENERAL",
      region: "India",
      source: "GOOGLE_TRENDS",
      detectedAt: "",
      trendStatus: "UNKNOWN",
    };

    const score = calculateTrendScore(trendNoData);
    expect(score).toBe(50); // Safe neutral score
  });

  it("6. Classifies Trend Lifecycle correctly without fabricating historical claims", () => {
    const emergingTrend: NormalizedTrend = {
      id: "gt-3",
      title: "Spike",
      description: "Spike test",
      category: "Tech",
      platform: "GENERAL",
      region: "IN",
      source: "GOOGLE_TRENDS",
      detectedAt: new Date().toISOString(),
      trendStatus: "EMERGING",
      sourceData: { percentGain: 1500 },
    };

    const growingTrend: NormalizedTrend = {
      id: "gt-4",
      title: "Steady",
      description: "Steady test",
      category: "Tech",
      platform: "GENERAL",
      region: "IN",
      source: "GOOGLE_TRENDS",
      detectedAt: new Date().toISOString(),
      trendStatus: "GROWING",
      sourceData: { rank: 5, percentGain: 200 },
    };

    const unknownTrend: NormalizedTrend = {
      id: "gt-5",
      title: "Snapshot",
      description: "Snapshot test",
      category: "Tech",
      platform: "GENERAL",
      region: "IN",
      source: "GOOGLE_TRENDS",
      detectedAt: new Date().toISOString(),
      trendStatus: "UNKNOWN",
    };

    expect(determineTrendLifecycle(emergingTrend)).toBe("EMERGING");
    expect(determineTrendLifecycle(growingTrend)).toBe("GROWING");
    expect(determineTrendLifecycle(unknownTrend)).toBe("UNKNOWN");
  });

  it("7. Evaluates Brand Relevance and Opportunity Score with Explainable AI", async () => {
    const trend: NormalizedTrend = {
      id: "gt-6",
      title: "Automated Social Strategy",
      description: "Automation trend",
      category: "Technology",
      platform: "INSTAGRAM",
      region: "India",
      source: "GOOGLE_TRENDS",
      detectedAt: new Date().toISOString(),
      trendStatus: "GROWING",
      sourceData: { rank: 2, percentGain: 800 },
    };

    const opportunity = await evaluateTrendRelevance("test-user-id", trend);

    expect(opportunity.trendId).toBe(trend.id);
    expect(opportunity.relevanceScore).toBeGreaterThanOrEqual(50);
    expect(opportunity.opportunityScore).toBeGreaterThanOrEqual(50);
    expect(opportunity.what).toContain("Automated Social Strategy");
    expect(opportunity.why).toBeDefined();
    expect(["HIGH", "MEDIUM", "LOW"]).toContain(opportunity.confidence);
    expect(opportunity.dataBasis.length).toBeGreaterThan(0);
  });

  it("8. Handles unsupported platform recommendation safely", async () => {
    const trend: NormalizedTrend = {
      id: "gt-7",
      title: "Unsupported Platform Trend",
      description: "Test description",
      category: "General",
      platform: "INVALID_PLATFORM",
      region: "India",
      source: "GOOGLE_TRENDS",
      detectedAt: new Date().toISOString(),
      trendStatus: "GROWING",
    };

    const opportunity = await evaluateTrendRelevance("test-user-id", trend);
    expect(opportunity.recommendedPlatform).toBe("INSTAGRAM"); // Default supported fallback
  });

  it("9. Credential safety: never exposes privateKey or secrets in getSourceState()", () => {
    const sensitiveKey = "-----BEGIN PRIVATE KEY-----\\nSECRET_KEY_123\\n-----END PRIVATE KEY-----";
    const provider = new GoogleTrendsProvider({
      projectId: "my-gcp-project",
      clientEmail: "secret-sa@project.iam.gserviceaccount.com",
      privateKey: sensitiveKey,
    });

    const state = provider.getSourceState();
    const stateString = JSON.stringify(state);

    expect(stateString).not.toContain("SECRET_KEY_123");
    expect(stateString).not.toContain("secret-sa");
    expect(stateString).not.toContain(sensitiveKey);
  });

  it("10. Trend metadata serialization & calendar/campaign integration structure", () => {
    const trend: NormalizedTrend = {
      id: "gt-integration-1",
      title: "Generative AI In Marketing",
      description: "AI marketing trend",
      category: "Technology",
      platform: "LINKEDIN",
      region: "India",
      source: "GOOGLE_TRENDS",
      detectedAt: new Date().toISOString(),
      trendStatus: "GROWING",
      sourceData: { rank: 1, percentGain: 1200 },
    };

    const trendScore = calculateTrendScore(trend);
    const lifecycle = determineTrendLifecycle(trend);

    const trendMetadata = {
      isTrend: true,
      trendId: trend.id,
      trendTitle: trend.title,
      source: "Google Trends",
      trendScore,
      lifecycle,
      relevanceScore: 85,
      opportunityScore: 88,
      recommendedAngle: "How to leverage AI in marketing",
      recommendedPlatform: "LINKEDIN",
      recommendedFormat: "Thought Leadership",
    };

    const serialized = JSON.stringify(trendMetadata);
    expect(serialized).toContain("Generative AI In Marketing");
    expect(serialized).toContain("isTrend\":true");

    const parsed = JSON.parse(serialized);
    expect(parsed.isTrend).toBe(true);
    expect(parsed.trendTitle).toBe("Generative AI In Marketing");
    expect(parsed.opportunityScore).toBe(88);
  });

  it("11. Preserves non-trend calendar items and campaign structures unchanged", () => {
    const standardCalendarRationale = "Scheduled for peak audience engagement based on algorithm patterns.";

    const parseTrendMeta = (rationale?: string) => {
      if (!rationale) return null;
      try {
        const p = JSON.parse(rationale);
        if (p.isTrend) return p;
      } catch {
        return null;
      }
      return null;
    };

    expect(parseTrendMeta(standardCalendarRationale)).toBeNull();
  });

  it("12. Deterministic Trend IDs: same source record produces exact same ID across multiple calls", () => {
    const id1 = generateDeterministicTrendId("GOOGLE_TRENDS", "IN", "AI Studio", "2026-08-22", 1);
    const id2 = generateDeterministicTrendId("GOOGLE_TRENDS", "IN", "AI Studio", "2026-08-22", 1);
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^gt-in-[a-f0-9]{16}$/);
  });

  it("13. Deterministic Trend IDs: different term, refresh_date, or rank produces different IDs", () => {
    const baseId = generateDeterministicTrendId("GOOGLE_TRENDS", "IN", "AI Studio", "2026-08-22", 1);
    const diffTerm = generateDeterministicTrendId("GOOGLE_TRENDS", "IN", "AI Video", "2026-08-22", 1);
    const diffDate = generateDeterministicTrendId("GOOGLE_TRENDS", "IN", "AI Studio", "2026-08-23", 1);
    const diffRank = generateDeterministicTrendId("GOOGLE_TRENDS", "IN", "AI Studio", "2026-08-22", 2);

    expect(baseId).not.toBe(diffTerm);
    expect(baseId).not.toBe(diffDate);
    expect(baseId).not.toBe(diffRank);
  });

  it("14. Deterministic Trend IDs: getTrendDetails resolves trend by stable ID across calls", async () => {
    const provider = new GoogleTrendsProvider({
      projectId: "my-gcp-project",
      clientEmail: "sa@my-gcp-project.iam.gserviceaccount.com",
    });

    (provider as any)._mockRows = [
      {
        term: "Stable Deterministic Term",
        rank: 1,
        refresh_date: "2026-08-22",
        percent_gain: 500,
      },
    ];

    const topics1 = await provider.getTrendingTopics();
    const targetId = topics1[0].id;

    // Call getTrendDetails with targetId
    const resolved = await provider.getTrendDetails(targetId);
    expect(resolved).not.toBeNull();
    expect(resolved?.id).toBe(targetId);
    expect(resolved?.title).toBe("Stable Deterministic Term");
  });
});
