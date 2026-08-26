import { prisma } from "@ai-social/database";
import { ITrendSource } from "./trend-source-interface.js";
import { NullTrendProvider } from "./null-trend-provider.js";
import { GoogleTrendsProvider } from "./google-trends-provider.js";
import {
  NormalizedTrend,
  TrendOpportunity,
  TrendQueryFilterInput,
  TrendSourceState,
  DetailedTrendResponse,
  TrendLifecycle,
} from "@ai-social/shared";
import { getBrandProfile } from "../brand-service.js";
import { getUserContentItems } from "../performance-service.js";

let customProviderOverride: ITrendSource | null = null;
let googleProviderSingleton: GoogleTrendsProvider | null = null;

export function setTrendProvider(provider: ITrendSource) {
  customProviderOverride = provider;
}

export function getTrendProvider(): ITrendSource {
  if (customProviderOverride) return customProviderOverride;

  if (!googleProviderSingleton) {
    googleProviderSingleton = new GoogleTrendsProvider();
  }

  if (googleProviderSingleton.isConfigured()) {
    return googleProviderSingleton;
  }
  return new NullTrendProvider();
}

export function getTrendSourceState(): TrendSourceState {
  return getTrendProvider().getSourceState();
}

export function calculateTrendScore(trend: NormalizedTrend): number {
  const rank = trend.sourceData?.rank;
  const percentGain = trend.sourceData?.percentGain;

  const scores: { value: number; weight: number }[] = [];

  // 1. Rank signal (0-100)
  if (typeof rank === "number" && rank > 0) {
    const rankScore = Math.max(0, 100 - (rank - 1) * 3);
    scores.push({ value: rankScore, weight: 0.4 });
  }

  // 2. Gain signal (0-100)
  if (typeof percentGain === "number" && percentGain >= 0) {
    const gainScore = Math.min(100, Math.round((percentGain / 2000) * 100));
    scores.push({ value: gainScore, weight: 0.4 });
  }

  // 3. Freshness signal (0-100)
  if (trend.detectedAt) {
    const diffHours = (Date.now() - new Date(trend.detectedAt).getTime()) / (1000 * 60 * 60);
    const freshnessScore = diffHours <= 24 ? 100 : diffHours <= 48 ? 80 : 60;
    scores.push({ value: freshnessScore, weight: 0.2 });
  }

  if (scores.length === 0) return 50; // Neutral default if zero signals exist

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scores.reduce((sum, s) => sum + s.value * s.weight, 0);

  return Math.min(100, Math.max(0, Math.round(weightedSum / totalWeight)));
}

export function determineTrendLifecycle(trend: NormalizedTrend): TrendLifecycle {
  const percentGain = trend.sourceData?.percentGain;
  const rank = trend.sourceData?.rank;

  if (typeof percentGain === "number" && percentGain >= 1000) {
    return "EMERGING";
  }

  if ((typeof percentGain === "number" && percentGain > 100) || (typeof rank === "number" && rank <= 10)) {
    return "GROWING";
  }

  if (trend.trendStatus && ["EMERGING", "GROWING", "PEAK", "DECLINING"].includes(trend.trendStatus)) {
    return trend.trendStatus as TrendLifecycle;
  }

  return "UNKNOWN";
}

export async function fetchTrendingTopics(filters?: TrendQueryFilterInput): Promise<NormalizedTrend[]> {
  const provider = getTrendProvider();
  const liveTrends = await provider.getTrendingTopics(filters);

  if (liveTrends.length > 0) {
    return liveTrends.map((t) => {
      const trendScore = calculateTrendScore(t);
      const lifecycle = determineTrendLifecycle(t);
      return {
        ...t,
        trendScore,
        lifecycle,
      };
    });
  }

  try {
    const dbTrends = await prisma.trend.findMany({
      where: {
        ...(filters?.platform && filters.platform.toUpperCase() !== "ALL" ? { platform: filters.platform.toUpperCase() } : {}),
        ...(filters?.category && filters.category.toUpperCase() !== "ALL" ? { category: filters.category } : {}),
        ...(filters?.trendStatus ? { trendStatus: filters.trendStatus } : {}),
      },
      orderBy: { detectedAt: "desc" },
      take: filters?.limit || 10,
    });

    if (dbTrends.length > 0) {
      return dbTrends.map((t: any) => {
        const norm: NormalizedTrend = {
          id: t.id,
          title: t.title,
          description: t.description,
          category: t.category,
          platform: t.platform,
          region: t.region,
          source: t.source,
          sourceUrl: t.sourceUrl || undefined,
          detectedAt: t.detectedAt.toISOString(),
          observedAt: t.observedAt?.toISOString(),
          trendStatus: t.trendStatus as any,
          relevanceScore: t.relevanceScore || undefined,
          sourceData: (t.sourceDataJson as Record<string, any>) || undefined,
        };
        norm.trendScore = calculateTrendScore(norm);
        norm.lifecycle = determineTrendLifecycle(norm);
        return norm;
      });
    }
  } catch {
    // Fallback
  }

  return [];
}

export async function searchTrends(query: string, filters?: TrendQueryFilterInput): Promise<NormalizedTrend[]> {
  const provider = getTrendProvider();
  const liveTrends = await provider.searchTrends(query, filters);
  if (liveTrends.length > 0) {
    return liveTrends.map((t) => ({
      ...t,
      trendScore: calculateTrendScore(t),
      lifecycle: determineTrendLifecycle(t),
    }));
  }

  try {
    const dbTrends = await prisma.trend.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { category: { contains: query } },
        ],
      },
      take: filters?.limit || 10,
    });

    return dbTrends.map((t: any) => {
      const norm: NormalizedTrend = {
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        platform: t.platform,
        region: t.region,
        source: t.source,
        sourceUrl: t.sourceUrl || undefined,
        detectedAt: t.detectedAt.toISOString(),
        observedAt: t.observedAt?.toISOString(),
        trendStatus: t.trendStatus as any,
        relevanceScore: t.relevanceScore || undefined,
      };
      norm.trendScore = calculateTrendScore(norm);
      norm.lifecycle = determineTrendLifecycle(norm);
      return norm;
    });
  } catch {
    return [];
  }
}

export async function evaluateTrendRelevance(
  userId: string,
  trend: NormalizedTrend
): Promise<TrendOpportunity> {
  const brand = await getBrandProfile(userId);
  const userPerformance = await getUserContentItems(userId);

  const trendScore = trend.trendScore || calculateTrendScore(trend);
  const lifecycle = trend.lifecycle || determineTrendLifecycle(trend);

  // Read user pillars
  let pillarName = "Educational & How-To";
  try {
    const pillars = await prisma.contentPillar.findMany({ where: { userId } });
    if (pillars.length > 0) pillarName = pillars[0].name;
  } catch {
    // Default pillar fallback
  }

  // Calculate Brand Relevance Score (0-100)
  let relevanceScore = 50; // Baseline
  const dataBasis: string[] = [];

  if (trend.source === "GOOGLE_TRENDS") {
    const refDate = trend.sourceData?.refreshDate || "Recent";
    const rankInfo = trend.sourceData?.rank ? ` (Rank #${trend.sourceData.rank})` : "";
    dataBasis.push(`Google Trends ${trend.region || "IN"} dataset (${refDate})${rankInfo}`);
  } else {
    dataBasis.push(`Source Signal: ${trend.source}`);
  }

  if (brand) {
    relevanceScore = 65;
    dataBasis.push(`Brand Industry: ${brand.industry || "General"}`);
    dataBasis.push(`Target Audience: ${brand.targetAudience || "General Audience"}`);

    if (brand.industry && trend.category.toLowerCase().includes(brand.industry.toLowerCase())) {
      relevanceScore += 20;
    }
  } else {
    dataBasis.push("Default Brand Profile settings");
  }

  // Check Performance History (ONLY include if real history exists!)
  let recommendedFormat = "Carousel";
  let performanceBonus = 0;
  if (userPerformance && userPerformance.length > 0) {
    const topPost = userPerformance[0];
    recommendedFormat = topPost.format || "Carousel";
    performanceBonus = 10;
    dataBasis.push(
      `Account Performance: ${recommendedFormat} format demonstrates top historical engagement (${topPost.metrics?.engagementRate || 5.0}%)`
    );
  }

  // Calculate Opportunity Score (0-100)
  const opportunityScore = Math.min(
    98,
    Math.max(
      10,
      Math.round(trendScore * 0.45 + relevanceScore * 0.45 + performanceBonus)
    )
  );

  // Platform recommendation logic
  const supportedPlatforms = ["INSTAGRAM", "LINKEDIN", "X", "TIKTOK", "YOUTUBE", "FACEBOOK"];
  let recommendedPlatform = "INSTAGRAM";

  if (trend.platform && supportedPlatforms.includes(trend.platform.toUpperCase())) {
    recommendedPlatform = trend.platform.toUpperCase();
  } else if (brand && (brand as any).primaryPlatform && supportedPlatforms.includes((brand as any).primaryPlatform.toUpperCase())) {
    recommendedPlatform = (brand as any).primaryPlatform.toUpperCase();
  } else if (!supportedPlatforms.includes(recommendedPlatform)) {
    recommendedPlatform = "Platform recommendation unavailable.";
  }

  // Supported format check
  const supportedFormats = ["Carousel", "Post", "Reel", "Video", "Article", "Thread"];
  if (!supportedFormats.includes(recommendedFormat)) {
    recommendedFormat = "Carousel";
  }

  const confidence: "HIGH" | "MEDIUM" | "LOW" =
    opportunityScore >= 80 ? "HIGH" : opportunityScore >= 60 ? "MEDIUM" : "LOW";

  const brandLabel = brand?.brandName || "Your Brand";
  const recommendedAngle = `How ${brandLabel} Leverages "${trend.title}" to Drive Growth`;

  const what = `Create an ${recommendedFormat.toLowerCase()} breakdown analyzing "${trend.title}".`;
  const why = `This trend has a Trend Score of ${trendScore}/100 and aligns with your ${brand?.industry || "industry"} niche.`;

  return {
    id: `opp-${trend.id}-${userId}`,
    trendId: trend.id,
    trendScore,
    lifecycle,
    relevanceScore: Math.min(98, relevanceScore),
    opportunityScore,
    recommendedAngle,
    recommendedPlatform,
    recommendedFormat,
    recommendedCta: "Save this trend opportunity for your next content batch",
    contentPillarName: pillarName,
    what,
    why,
    confidence,
    dataBasis,
  };
}

export async function getDetailedTrendInfo(
  userId: string,
  trendId: string
): Promise<DetailedTrendResponse> {
  const provider = getTrendProvider();
  const sourceState = provider.getSourceState();

  let trend = await provider.getTrendDetails(trendId);

  if (!trend) {
    try {
      const dbTrend = await prisma.trend.findUnique({ where: { id: trendId } });
      if (dbTrend) {
        trend = {
          id: dbTrend.id,
          title: dbTrend.title,
          description: dbTrend.description,
          category: dbTrend.category,
          platform: dbTrend.platform,
          region: dbTrend.region,
          source: dbTrend.source,
          sourceUrl: dbTrend.sourceUrl || undefined,
          detectedAt: dbTrend.detectedAt.toISOString(),
          observedAt: dbTrend.observedAt?.toISOString(),
          trendStatus: dbTrend.trendStatus as any,
          relevanceScore: dbTrend.relevanceScore || undefined,
          sourceData: (dbTrend.sourceDataJson as Record<string, any>) || undefined,
        };
      }
    } catch {
      // Ignore DB error
    }
  }

  if (!trend) {
    throw new Error("Trend not found");
  }

  trend.trendScore = calculateTrendScore(trend);
  trend.lifecycle = determineTrendLifecycle(trend);

  const opportunity = await evaluateTrendRelevance(userId, trend);
  trend.relevanceScore = opportunity.relevanceScore;
  trend.opportunityScore = opportunity.opportunityScore;

  return {
    trend,
    sourceState,
    opportunity,
  };
}
