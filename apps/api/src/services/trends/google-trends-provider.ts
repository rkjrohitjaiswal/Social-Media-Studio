import { createHash } from "crypto";
import { ITrendSource } from "./trend-source-interface.js";
import {
  NormalizedTrend,
  TrendQueryFilterInput,
  TrendSourceState,
} from "@ai-social/shared";

export type GoogleTrendsProviderStatus = "NOT_CONFIGURED" | "CONNECTED" | "NO_DATA" | "ERROR";

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function generateDeterministicTrendId(
  provider: string,
  region: string,
  term: string,
  refreshDate: any,
  rank: number | string
): string {
  const cleanProvider = (provider || "gt").toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanRegion = (region || "global").toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanTerm = (term || "unknown").toLowerCase().trim();

  let dateStr = "nodate";
  if (typeof refreshDate === "string") {
    dateStr = refreshDate;
  } else if (refreshDate && typeof refreshDate === "object" && refreshDate.value) {
    dateStr = String(refreshDate.value);
  } else if (refreshDate instanceof Date) {
    dateStr = refreshDate.toISOString();
  } else if (refreshDate) {
    dateStr = String(refreshDate);
  }

  const cleanDate = dateStr.substring(0, 10);
  const cleanRank = String(rank || "0");

  const rawString = `${cleanProvider}:${cleanRegion}:${cleanTerm}:${cleanDate}:${cleanRank}`;
  const hash = createHash("md5").update(rawString).digest("hex").substring(0, 16);
  return `gt-${cleanRegion}-${hash}`;
}

export class GoogleTrendsProvider implements ITrendSource {
  public providerName = "Google Trends (BigQuery)";

  private projectId: string;
  private clientEmail: string;
  private privateKey: string;
  private defaultRegion: string;
  private status: GoogleTrendsProviderStatus = "NOT_CONFIGURED";

  // In-memory server-side cache (15 minutes TTL to limit query costs)
  private cache: Map<string, CacheEntry<NormalizedTrend[]>> = new Map();
  private cacheTTLMs = 15 * 60 * 1000;

  constructor(config?: {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
    defaultRegion?: string;
  }) {
    this.projectId = config?.projectId || process.env.GOOGLE_CLOUD_PROJECT_ID || "";
    this.clientEmail = config?.clientEmail || process.env.GOOGLE_CLOUD_CLIENT_EMAIL || "";
    const rawKey = config?.privateKey || process.env.GOOGLE_CLOUD_PRIVATE_KEY || "";
    this.privateKey = rawKey.replace(/\\n/g, "\n");
    this.defaultRegion = config?.defaultRegion || process.env.GOOGLE_TRENDS_DEFAULT_REGION || "IN";

    if (this.projectId && (this.clientEmail || process.env.NODE_ENV === "test")) {
      this.status = "CONNECTED";
    } else {
      this.status = "NOT_CONFIGURED";
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.projectId && (this.clientEmail || process.env.NODE_ENV === "test"));
  }

  public getStatus(): GoogleTrendsProviderStatus {
    return this.status;
  }

  public getSourceState(): TrendSourceState {
    const isConn = this.isConfigured() && this.status !== "ERROR";
    let msg = "Google Trends BigQuery provider is active and connected.";

    if (this.status === "NOT_CONFIGURED") {
      msg = "Google Cloud credentials not configured. Using fallback NullTrendProvider.";
    } else if (this.status === "NO_DATA") {
      msg = "Connected to BigQuery, but no trend data returned for the region.";
    } else if (this.status === "ERROR") {
      msg = "Error executing BigQuery dataset query. Check Google Cloud permissions.";
    }

    return {
      isConnected: isConn,
      providerName: this.providerName,
      statusMessage: msg,
      availableCategories: ["General Search", "Technology", "Business", "Entertainment", "News"],
    };
  }

  public async getTrendingTopics(filters?: TrendQueryFilterInput): Promise<NormalizedTrend[]> {
    if (!this.isConfigured()) return [];

    let region = filters?.region || this.defaultRegion;
    if (region === "GLOBAL" || region === "ALL") region = "IN";

    const cacheKey = `topics_${region}_${filters?.category || "ALL"}_${filters?.limit || 10}`;

    // 1. Check in-memory cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTLMs) {
      return cached.data;
    }

    try {
      // Query international_top_rising_terms for the newest available refresh_date
      const rawRows = await this.executeBigQueryQuery({
        query: `
          SELECT refresh_date, country_code, country_name, term, MIN(rank) as rank, MAX(percent_gain) as percent_gain
          FROM \`bigquery-public-data.google_trends.international_top_rising_terms\`
          WHERE country_code = @region
            AND refresh_date = (
              SELECT MAX(refresh_date)
              FROM \`bigquery-public-data.google_trends.international_top_rising_terms\`
              WHERE country_code = @region
            )
          GROUP BY refresh_date, country_code, country_name, term
          ORDER BY percent_gain DESC, rank ASC
          LIMIT @limit
        `,
        params: {
          region,
          limit: filters?.limit || 10,
        },
      });

      if (!rawRows || rawRows.length === 0) {
        this.status = "NO_DATA";
        return [];
      }

      this.status = "CONNECTED";
      const normalized = this.normalizeRows(rawRows, region);

      // Save to server-side cache
      this.cache.set(cacheKey, { data: normalized, timestamp: Date.now() });
      return normalized;
    } catch {
      this.status = "ERROR";
      return [];
    }
  }

  public async searchTrends(query: string, filters?: TrendQueryFilterInput): Promise<NormalizedTrend[]> {
    if (!this.isConfigured() || !query) return [];

    let region = filters?.region || this.defaultRegion;
    if (region === "GLOBAL" || region === "ALL") region = "IN";

    const cacheKey = `search_${query}_${region}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTLMs) {
      return cached.data;
    }

    try {
      const rawRows = await this.executeBigQueryQuery({
        query: `
          SELECT refresh_date, country_code, country_name, term, rank, percent_gain
          FROM \`bigquery-public-data.google_trends.international_top_rising_terms\`
          WHERE country_code = @region AND LOWER(term) LIKE @queryPattern
          ORDER BY refresh_date DESC, rank ASC
          LIMIT @limit
        `,
        params: {
          region,
          queryPattern: `%${query.toLowerCase()}%`,
          limit: filters?.limit || 10,
        },
      });

      const normalized = this.normalizeRows(rawRows, region);
      this.cache.set(cacheKey, { data: normalized, timestamp: Date.now() });
      return normalized;
    } catch {
      this.status = "ERROR";
      return [];
    }
  }

  public async getTrendDetails(trendId: string): Promise<NormalizedTrend | null> {
    if (!this.isConfigured()) return null;

    // 1. Search in cached results
    for (const entry of this.cache.values()) {
      const match = entry.data.find((t) => t.id === trendId);
      if (match) return match;
    }

    // 2. If cache miss, fetch latest trending topics (bypass 10-limit if needed)
    const latestTrends = await this.getTrendingTopics({ region: this.defaultRegion, limit: 50 });
    const match = latestTrends.find((t) => t.id === trendId);
    if (match) return match;

    return null;
  }

  // Internal BigQuery Query Execution (Safe Parameterized SQL Execution)
  private async executeBigQueryQuery(options: { query: string; params: Record<string, any> }): Promise<any[]> {
    // In test or mocked mode, return mock dataset if injected
    if ((this as any)._mockRows) {
      return (this as any)._mockRows;
    }

    if (this.isConfigured() && !process.env.VITEST) {
      try {
        const { BigQuery } = await import("@google-cloud/bigquery");
        const bq = new BigQuery({
          projectId: this.projectId,
          credentials: {
            client_email: this.clientEmail,
            private_key: this.privateKey,
          },
        });

        const [rows] = await bq.query({
          query: options.query,
          params: options.params,
        });

        return rows || [];
      } catch (err: any) {
        this.status = "ERROR";
        return [];
      }
    }

    return [];
  }

  private normalizeRows(rows: any[], region: string): NormalizedTrend[] {
    return rows.map((r, idx) => {
      const rawDate = r.refresh_date?.value || r.refresh_date || "2026-08-22";
      const formattedDate = typeof rawDate === "string" ? new Date(rawDate).toISOString() : new Date().toISOString();
      const countryName = r.country_name || region;
      const rankVal = r.rank || idx + 1;
      const termVal = r.term || "Google Trend";

      const deterministicId = generateDeterministicTrendId(
        "GOOGLE_TRENDS",
        r.country_code || region,
        termVal,
        rawDate,
        rankVal
      );

      return {
        id: deterministicId,
        title: termVal,
        description: `Google Trends rising query in ${countryName} (Rank #${rankVal}).`,
        category: "Google Trends",
        platform: "GENERAL",
        region: countryName,
        source: "GOOGLE_TRENDS",
        sourceUrl: `https://trends.google.com/trends/explore?q=${encodeURIComponent(termVal)}`,
        detectedAt: formattedDate,
        trendStatus: r.percent_gain && r.percent_gain > 100 ? "EMERGING" : "GROWING",
        sourceData: {
          rank: rankVal,
          percentGain: r.percent_gain,
          countryCode: r.country_code || region,
          refreshDate: typeof rawDate === "object" && rawDate?.value ? rawDate.value : String(rawDate),
        },
      };
    });
  }

  public clearCache(): void {
    this.cache.clear();
  }
}
