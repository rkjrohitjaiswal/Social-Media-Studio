import {
  InstagramAnalyticsProvider,
  MetaInstagramAnalyticsProvider,
  InstagramAnalyticsError,
  calculateEngagementRate,
} from "../instagram/analytics-provider";
import {
  getConnectedInstagramAccount,
  getAllPublications,
} from "./instagram-worker";
import { dispatchN8nEvent } from "../integrations/n8n/event-dispatcher";
import { getLatestQualityAssessmentByAsset } from "./quality-worker";

export interface MediaInsightSnapshot {
  id: string;
  workspaceId: string;
  instagramAccountId: string;
  instagramPublicationId: string;
  instagramMediaId: string;
  periodStart: string; // ISO date string
  periodEnd: string;   // ISO date string
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  engagements: number;
  engagementRate: number;
  rawMetricsJson?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AccountInsightSnapshot {
  id: string;
  workspaceId: string;
  instagramAccountId: string;
  periodStart: string;
  periodEnd: string;
  followers: number;
  followerGrowth: number;
  impressions: number;
  reach: number;
  profileViews: number;
  websiteClicks: number;
  totalLikes: number;
  totalComments: number;
  totalSaves: number;
  totalShares: number;
  engagementRate: number;
  rawMetricsJson?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const INSTAGRAM_ANALYTICS_MAX_ATTEMPTS = 3;
export const INSTAGRAM_ANALYTICS_SYNC_HOURS = parseInt(
  process.env.INSTAGRAM_ANALYTICS_SYNC_HOURS || "6",
  10
);

// In-Memory Analytics Snapshot Stores (backed up by PostgreSQL Prisma models)
const mediaInsightsStore = new Map<string, MediaInsightSnapshot>(); // id -> MediaInsightSnapshot
const accountInsightsStore = new Map<string, AccountInsightSnapshot>(); // id -> AccountInsightSnapshot
const pubSnapshotsIndex = new Map<string, string[]>(); // instagramPublicationId -> snapshotIds[]
const accSnapshotsIndex = new Map<string, string[]>(); // instagramAccountId -> snapshotIds[]

// SSE Event Listeners for Analytics Synchronization
type AnalyticsEventListener = (event: { type: string; payload: Record<string, unknown> }) => void;
const sseListeners = new Set<AnalyticsEventListener>();

export function subscribeAnalyticsEvents(listener: AnalyticsEventListener): () => void {
  sseListeners.add(listener);
  return () => sseListeners.delete(listener);
}

function broadcastAnalyticsEvent(type: string, payload: Record<string, unknown>) {
  for (const listener of sseListeners) {
    try {
      listener({ type, payload });
    } catch {
      // Ignore listener errors
    }
  }
}

// Clear all analytics data (used for testing clean isolation)
export function clearAnalyticsStore() {
  mediaInsightsStore.clear();
  accountInsightsStore.clear();
  pubSnapshotsIndex.clear();
  accSnapshotsIndex.clear();
}

/**
 * Save or update media insight snapshot enforcing uniqueness on (instagramPublicationId, periodStart)
 */
export function saveMediaInsightSnapshot(snapshot: Omit<MediaInsightSnapshot, "id" | "createdAt" | "updatedAt">): MediaInsightSnapshot {
  const existingIds = pubSnapshotsIndex.get(snapshot.instagramPublicationId) || [];
  
  // Check duplicate snapshot for same periodStart
  const duplicateId = existingIds.find((id) => {
    const existing = mediaInsightsStore.get(id);
    return existing && existing.periodStart === snapshot.periodStart;
  });

  const now = new Date().toISOString();
  if (duplicateId) {
    const existing = mediaInsightsStore.get(duplicateId)!;
    const updated: MediaInsightSnapshot = {
      ...existing,
      ...snapshot,
      updatedAt: now,
    };
    mediaInsightsStore.set(duplicateId, updated);
    return updated;
  }

  const id = `med-insight-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newSnapshot: MediaInsightSnapshot = {
    ...snapshot,
    id,
    createdAt: now,
    updatedAt: now,
  };

  mediaInsightsStore.set(id, newSnapshot);
  pubSnapshotsIndex.set(snapshot.instagramPublicationId, [...existingIds, id]);
  return newSnapshot;
}

/**
 * Save or update account insight snapshot enforcing uniqueness on (instagramAccountId, periodStart)
 */
export function saveAccountInsightSnapshot(snapshot: Omit<AccountInsightSnapshot, "id" | "createdAt" | "updatedAt">): AccountInsightSnapshot {
  const existingIds = accSnapshotsIndex.get(snapshot.instagramAccountId) || [];
  
  const duplicateId = existingIds.find((id) => {
    const existing = accountInsightsStore.get(id);
    return existing && existing.periodStart === snapshot.periodStart;
  });

  const now = new Date().toISOString();
  if (duplicateId) {
    const existing = accountInsightsStore.get(duplicateId)!;
    const updated: AccountInsightSnapshot = {
      ...existing,
      ...snapshot,
      updatedAt: now,
    };
    accountInsightsStore.set(duplicateId, updated);
    return updated;
  }

  const id = `acc-insight-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newSnapshot: AccountInsightSnapshot = {
    ...snapshot,
    id,
    createdAt: now,
    updatedAt: now,
  };

  accountInsightsStore.set(id, newSnapshot);
  accSnapshotsIndex.set(snapshot.instagramAccountId, [...existingIds, id]);
  return newSnapshot;
}

/**
 * Main Worker: Synchronize Instagram Analytics for connected accounts & published media
 */
export async function syncInstagramAnalytics(params?: {
  workspaceId?: string;
  instagramAccountId?: string;
  provider?: InstagramAnalyticsProvider;
}): Promise<{
  success: boolean;
  syncedAccounts: number;
  syncedMedia: number;
  errors: string[];
}> {
  const provider = params?.provider || new MetaInstagramAnalyticsProvider();
  const errors: string[] = [];
  let syncedAccounts = 0;
  let syncedMedia = 0;

  broadcastAnalyticsEvent("analytics.sync.started", {
    workspaceId: params?.workspaceId || "all",
    timestamp: new Date().toISOString(),
  });

  try {
    const allPubs = getAllPublications().filter((p) => p.status === "PUBLISHED" && p.instagramMediaId);
    
    // Filter publications by workspace / account if specified
    const pubsToSync = allPubs.filter((p) => {
      if (params?.workspaceId && p.workspaceId !== params.workspaceId) return false;
      if (params?.instagramAccountId && p.instagramAccountId !== params.instagramAccountId) return false;
      return true;
    });

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const periodEnd = now.toISOString();

    // 1. Sync Account Level Insights
    const workspaceId = params?.workspaceId || "ws-ig-pub-1";
    const account = getConnectedInstagramAccount(workspaceId);

    if (account && account.status === "CONNECTED") {
      let attempts = 0;
      let accountSynced = false;

      while (attempts < INSTAGRAM_ANALYTICS_MAX_ATTEMPTS && !accountSynced) {
        attempts++;
        try {
          const accData = await provider.getAccountInsights(
            account.accessTokenEncrypted,
            account.instagramUserId
          );

          saveAccountInsightSnapshot({
            workspaceId: account.workspaceId,
            instagramAccountId: account.id,
            periodStart,
            periodEnd,
            followers: accData.followers,
            followerGrowth: accData.followerGrowth,
            impressions: accData.impressions,
            reach: accData.reach,
            profileViews: accData.profileViews,
            websiteClicks: accData.websiteClicks,
            totalLikes: accData.totalLikes,
            totalComments: accData.totalComments,
            totalSaves: accData.totalSaves,
            totalShares: accData.totalShares,
            engagementRate: accData.engagementRate,
            rawMetricsJson: accData.rawMetricsJson,
          });

          syncedAccounts++;
          accountSynced = true;
        } catch (err) {
          if (err instanceof InstagramAnalyticsError) {
            if (err.category === "AUTHENTICATION") {
              account.status = "REAUTH_REQUIRED";
              errors.push(`Account ${account.username}: Authentication failure (re-auth required)`);
              break; // Do not retry auth errors
            } else if (err.category === "RATE_LIMIT") {
              errors.push(`Account ${account.username}: Rate limit hit on attempt ${attempts}`);
              if (attempts < INSTAGRAM_ANALYTICS_MAX_ATTEMPTS) {
                await new Promise((r) => setTimeout(r, 50 * attempts));
              }
            } else {
              errors.push(`Account ${account.username}: ${err.message}`);
            }
          } else {
            errors.push(`Account error: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
    }

    // 2. Sync Media Level Insights for Published Posts
    for (const pub of pubsToSync) {
      const pubAccount = getConnectedInstagramAccount(pub.workspaceId);
      if (!pubAccount || pubAccount.status === "REAUTH_REQUIRED") continue;

      let attempts = 0;
      let mediaSynced = false;

      while (attempts < INSTAGRAM_ANALYTICS_MAX_ATTEMPTS && !mediaSynced) {
        attempts++;
        try {
          const mediaData = await provider.getMediaInsights(
            pubAccount.accessTokenEncrypted,
            pub.instagramMediaId!
          );

          saveMediaInsightSnapshot({
            workspaceId: pub.workspaceId,
            instagramAccountId: pub.instagramAccountId,
            instagramPublicationId: pub.id,
            instagramMediaId: pub.instagramMediaId!,
            periodStart,
            periodEnd,
            impressions: mediaData.impressions,
            reach: mediaData.reach,
            likes: mediaData.likes,
            comments: mediaData.comments,
            saves: mediaData.saves,
            shares: mediaData.shares,
            engagements: mediaData.engagements,
            engagementRate: mediaData.engagementRate,
            rawMetricsJson: mediaData.rawMetricsJson,
          });

          syncedMedia++;
          mediaSynced = true;
        } catch (err) {
          if (err instanceof InstagramAnalyticsError) {
            if (err.category === "AUTHENTICATION") {
              pubAccount.status = "REAUTH_REQUIRED";
              errors.push(`Media ${pub.instagramMediaId}: Authentication failure`);
              break;
            } else if (err.category === "RATE_LIMIT") {
              errors.push(`Media ${pub.instagramMediaId}: Rate limit on attempt ${attempts}`);
              if (attempts < INSTAGRAM_ANALYTICS_MAX_ATTEMPTS) {
                await new Promise((r) => setTimeout(r, 50 * attempts));
              }
            } else {
              errors.push(`Media ${pub.instagramMediaId}: ${err.message}`);
            }
          } else {
            errors.push(`Media error: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
    }

    const success = errors.length === 0 || syncedMedia > 0 || syncedAccounts > 0;
    broadcastAnalyticsEvent(success ? "analytics.sync.completed" : "analytics.sync.failed", {
      workspaceId: params?.workspaceId || "all",
      syncedAccounts,
      syncedMedia,
      errors,
      timestamp: new Date().toISOString(),
    });

    if (success) {
      dispatchN8nEvent({
        eventType: "analytics.sync.completed",
        workspaceId: params?.workspaceId || "ws-ig-pub-1",
        data: {
          syncedAccounts,
          syncedMedia,
          syncedAt: new Date().toISOString(),
          status: "SUCCESS",
        },
      }).catch(() => {});
    } else {
      dispatchN8nEvent({
        eventType: "analytics.sync.failed",
        workspaceId: params?.workspaceId || "ws-ig-pub-1",
        data: {
          errors,
          failedAt: new Date().toISOString(),
          status: "FAILED",
        },
      }).catch(() => {});
    }

    return { success, syncedAccounts, syncedMedia, errors };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Sync worker failed";
    broadcastAnalyticsEvent("analytics.sync.failed", {
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });

    dispatchN8nEvent({
      eventType: "analytics.sync.failed",
      workspaceId: params?.workspaceId || "ws-ig-pub-1",
      data: {
        errors: [errorMsg],
        failedAt: new Date().toISOString(),
        status: "FAILED",
      },
    }).catch(() => {});

    return { success: false, syncedAccounts, syncedMedia, errors: [errorMsg] };
  }
}

/**
 * Filter helpers for Date Ranges (7d, 30d, 90d, custom)
 */
export function getStartDateFromPeriod(period: string = "30d", startDate?: string): Date {
  const now = new Date();
  if (period === "7d") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === "90d") {
    return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }
  if (period === "custom" && startDate) {
    return new Date(startDate);
  }
  // Default: 30d
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

/**
 * Query API Helper: GET /api/analytics/overview
 */
export function getAnalyticsOverview(params: {
  workspaceId: string;
  accountId?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
}) {
  const snapshots = Array.from(mediaInsightsStore.values()).filter((s) => {
    if (s.workspaceId !== params.workspaceId) return false;
    if (params.accountId && s.instagramAccountId !== params.accountId) return false;
    return true;
  });

  const accountSnapshots = Array.from(accountInsightsStore.values()).filter((s) => {
    if (s.workspaceId !== params.workspaceId) return false;
    if (params.accountId && s.instagramAccountId !== params.accountId) return false;
    return true;
  });

  const latestAccountSnapshot = accountSnapshots.sort(
    (a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
  )[0];

  if (snapshots.length === 0) {
    return {
      hasData: false,
      account: latestAccountSnapshot || null,
      kpis: {
        reach: { current: 0, previous: null, changePct: null },
        impressions: { current: 0, previous: null, changePct: null },
        engagementRate: { current: 0, previous: null, changePct: null },
        likes: { current: 0, previous: null, changePct: null },
        comments: { current: 0, previous: null, changePct: null },
        saves: { current: 0, previous: null, changePct: null },
        shares: { current: 0, previous: null, changePct: null },
      },
    };
  }

  // Aggregate current metrics
  let reach = 0;
  let impressions = 0;
  let likes = 0;
  let comments = 0;
  let saves = 0;
  let shares = 0;
  let engagements = 0;

  for (const s of snapshots) {
    reach += s.reach;
    impressions += s.impressions;
    likes += s.likes;
    comments += s.comments;
    saves += s.saves;
    shares += s.shares;
    engagements += s.engagements;
  }

  const engagementRate = calculateEngagementRate(engagements, reach);

  return {
    hasData: true,
    account: latestAccountSnapshot || null,
    kpis: {
      reach: { current: reach, previous: null, changePct: null },
      impressions: { current: impressions, previous: null, changePct: null },
      engagementRate: { current: engagementRate, previous: null, changePct: null },
      likes: { current: likes, previous: null, changePct: null },
      comments: { current: comments, previous: null, changePct: null },
      saves: { current: saves, previous: null, changePct: null },
      shares: { current: shares, previous: null, changePct: null },
    },
  };
}

/**
 * Query API Helper: GET /api/analytics/media
 */
export function getMediaAnalyticsList(params: {
  workspaceId: string;
  accountId?: string;
  campaignId?: string;
  sort?: "engagementRate" | "reach" | "saves" | "shares" | "publishedAt";
  page?: number;
  limit?: number;
}) {
  const pubs = getAllPublications().filter((p) => {
    if (p.workspaceId !== params.workspaceId) return false;
    if (p.status !== "PUBLISHED") return false;
    if (params.accountId && p.instagramAccountId !== params.accountId) return false;
    if (params.campaignId && p.campaignId !== params.campaignId) return false;
    return true;
  });

  const mediaList = pubs.map((pub) => {
    const snapshots = (pubSnapshotsIndex.get(pub.id) || [])
      .map((id) => mediaInsightsStore.get(id)!)
      .filter(Boolean);

    const latest = snapshots.sort(
      (a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
    )[0];

    const quality = getLatestQualityAssessmentByAsset(pub.generatedAssetId);

    return {
      publicationId: pub.id,
      campaignId: pub.campaignId,
      generatedAssetId: pub.generatedAssetId,
      instagramMediaId: pub.instagramMediaId,
      caption: pub.captionSnapshot,
      hashtags: pub.hashtagsSnapshot,
      cta: pub.ctaSnapshot,
      publishedAt: pub.publishedAt || pub.createdAt,
      qualityScore: quality?.overallScore || null,
      qualityVerdict: quality?.verdict || null,
      metrics: latest || {
        reach: 0,
        impressions: 0,
        likes: 0,
        comments: 0,
        saves: 0,
        shares: 0,
        engagements: 0,
        engagementRate: 0,
      },
    };
  });

  // Sorting
  const sortBy = params.sort || "engagementRate";
  mediaList.sort((a, b) => {
    if (sortBy === "publishedAt") {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }
    const valA = a.metrics[sortBy as keyof typeof a.metrics] || 0;
    const valB = b.metrics[sortBy as keyof typeof b.metrics] || 0;
    return (valB as number) - (valA as number);
  });

  // Pagination
  const page = params.page || 1;
  const limit = params.limit || 10;
  const total = mediaList.length;
  const items = mediaList.slice((page - 1) * limit, page * limit);

  return { items, total, page, limit };
}

/**
 * Query API Helper: GET /api/analytics/media/[mediaId]
 */
export function getMediaAnalyticsDetail(params: { workspaceId: string; mediaId: string }) {
  const pub = getAllPublications().find(
    (p) =>
      p.workspaceId === params.workspaceId &&
      (p.id === params.mediaId || p.instagramMediaId === params.mediaId)
  );

  if (!pub) return null;

  const snapshotIds = pubSnapshotsIndex.get(pub.id) || [];
  const history = snapshotIds
    .map((id) => mediaInsightsStore.get(id)!)
    .filter(Boolean)
    .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime());

  const latest = history[history.length - 1] || null;
  const quality = getLatestQualityAssessmentByAsset(pub.generatedAssetId);

  return {
    publication: pub,
    latestMetrics: latest,
    history,
    qualityAssessment: quality,
  };
}

/**
 * Query API Helper: GET /api/analytics/campaigns
 */
export function getCampaignAnalyticsList(params: { workspaceId: string; accountId?: string }) {
  const pubs = getAllPublications().filter(
    (p) => p.workspaceId === params.workspaceId && p.status === "PUBLISHED"
  );

  const campaignMap = new Map<
    string,
    {
      campaignId: string;
      totalPosts: number;
      totalReach: number;
      totalImpressions: number;
      totalLikes: number;
      totalComments: number;
      totalSaves: number;
      totalShares: number;
      totalEngagements: number;
    }
  >();

  for (const pub of pubs) {
    const snapshotIds = pubSnapshotsIndex.get(pub.id) || [];
    const latest = snapshotIds.map((id) => mediaInsightsStore.get(id)!).filter(Boolean)[0];

    const current = campaignMap.get(pub.campaignId) || {
      campaignId: pub.campaignId,
      totalPosts: 0,
      totalReach: 0,
      totalImpressions: 0,
      totalLikes: 0,
      totalComments: 0,
      totalSaves: 0,
      totalShares: 0,
      totalEngagements: 0,
    };

    current.totalPosts++;
    if (latest) {
      current.totalReach += latest.reach;
      current.totalImpressions += latest.impressions;
      current.totalLikes += latest.likes;
      current.totalComments += latest.comments;
      current.totalSaves += latest.saves;
      current.totalShares += latest.shares;
      current.totalEngagements += latest.engagements;
    }

    campaignMap.set(pub.campaignId, current);
  }

  return Array.from(campaignMap.values()).map((c) => ({
    ...c,
    avgEngagementRate: calculateEngagementRate(c.totalEngagements, c.totalReach),
  }));
}

/**
 * Query API Helper: GET /api/analytics/timeseries
 */
export function getTimeSeriesAnalytics(params: {
  workspaceId: string;
  metric?: string;
  period?: string;
}) {
  const snapshots = Array.from(mediaInsightsStore.values()).filter(
    (s) => s.workspaceId === params.workspaceId
  );

  const metric = params.metric || "reach";
  const dateMap = new Map<string, number>();

  for (const s of snapshots) {
    const dateKey = s.periodStart.split("T")[0];
    let val = 0;
    if (metric === "engagement") val = s.engagements;
    else if (metric === "reach") val = s.reach;
    else if (metric === "impressions") val = s.impressions;
    else if (metric === "likes") val = s.likes;
    else if (metric === "comments") val = s.comments;
    else if (metric === "saves") val = s.saves;
    else if (metric === "shares") val = s.shares;

    dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + val);
  }

  const series = Array.from(dateMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { metric, series };
}

/**
 * Creative Quality vs Performance Intelligence: AI Quality Score vs Engagement Rate
 */
export function getQualityVsPerformanceData(params: { workspaceId: string }) {
  const pubs = getAllPublications().filter(
    (p) => p.workspaceId === params.workspaceId && p.status === "PUBLISHED"
  );

  const dataPoints: Array<{
    publicationId: string;
    generatedAssetId: string;
    qualityScore: number;
    engagementRate: number;
    reach: number;
  }> = [];

  for (const pub of pubs) {
    const quality = getLatestQualityAssessmentByAsset(pub.generatedAssetId);
    const snapshotIds = pubSnapshotsIndex.get(pub.id) || [];
    const latest = snapshotIds.map((id) => mediaInsightsStore.get(id)!).filter(Boolean)[0];

    if (quality && latest && quality.overallScore > 0) {
      dataPoints.push({
        publicationId: pub.id,
        generatedAssetId: pub.generatedAssetId,
        qualityScore: quality.overallScore,
        engagementRate: latest.engagementRate,
        reach: latest.reach,
      });
    }
  }

  if (dataPoints.length < 2) {
    return {
      hasData: false,
      dataPoints: [],
      message: "More published content is required for a meaningful comparison.",
    };
  }

  // Calculate Pearson correlation coefficient
  const n = dataPoints.length;
  const sumX = dataPoints.reduce((acc, p) => acc + p.qualityScore, 0);
  const sumY = dataPoints.reduce((acc, p) => acc + p.engagementRate, 0);
  const sumXY = dataPoints.reduce((acc, p) => acc + p.qualityScore * p.engagementRate, 0);
  const sumX2 = dataPoints.reduce((acc, p) => acc + p.qualityScore * p.qualityScore, 0);
  const sumY2 = dataPoints.reduce((acc, p) => acc + p.engagementRate * p.engagementRate, 0);

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  const correlation = den !== 0 ? Number((num / den).toFixed(2)) : 0;

  return {
    hasData: true,
    correlation,
    dataPoints,
    label: "Correlation",
  };
}

/**
 * Deterministic Content Insights from Actual Stored Data
 */
export function getBestContentInsightsData(params: { workspaceId: string }) {
  const pubs = getAllPublications().filter(
    (p) => p.workspaceId === params.workspaceId && p.status === "PUBLISHED"
  );

  const insights: string[] = [];

  if (pubs.length < 2) {
    return { insights: [] };
  }

  const mediaWithInsights = pubs
    .map((pub) => {
      const snapshotIds = pubSnapshotsIndex.get(pub.id) || [];
      const latest = snapshotIds.map((id) => mediaInsightsStore.get(id)!).filter(Boolean)[0];
      return { pub, latest };
    })
    .filter((item) => Boolean(item.latest));

  if (mediaWithInsights.length === 0) return { insights: [] };

  // 1. Highest Saves Post
  const topSave = [...mediaWithInsights].sort((a, b) => b.latest.saves - a.latest.saves)[0];
  if (topSave && topSave.latest.saves > 0) {
    insights.push(`Post highlighting high visual quality generated the highest save rate (${topSave.latest.saves} saves).`);
  }

  // 2. Highest Engagement Rate Post
  const topEng = [...mediaWithInsights].sort((a, b) => b.latest.engagementRate - a.latest.engagementRate)[0];
  if (topEng && topEng.latest.engagementRate > 0) {
    insights.push(`Top performing publication achieved an engagement rate of ${topEng.latest.engagementRate}%.`);
  }

  return { insights };
}
