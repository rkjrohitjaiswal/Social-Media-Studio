import { MetaInstagramAnalyticsProvider } from "../src/lib/instagram/analytics-provider";

async function main() {
  const runReal = process.env.RUN_REAL_ANALYTICS_TEST === "true";

  if (!runReal) {
    console.log("==========================================");
    console.log("REAL INSTAGRAM ANALYTICS TEST: SKIPPED");
    console.log("Reason: RUN_REAL_ANALYTICS_TEST=true is not set in environment.");
    console.log("To run real Meta Graph API calls, execute:");
    console.log("RUN_REAL_ANALYTICS_TEST=true META_ACCESS_TOKEN=<your_token> npx ts-node scripts/test-real-analytics.ts");
    console.log("==========================================");
    process.exit(0);
  }

  const token = process.env.META_ACCESS_TOKEN;
  const mediaId = process.env.INSTAGRAM_MEDIA_ID;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;

  if (!token || !mediaId || !accountId) {
    console.error("Error: META_ACCESS_TOKEN, INSTAGRAM_MEDIA_ID, and INSTAGRAM_ACCOUNT_ID env variables are required for real analytics testing.");
    process.exit(1);
  }

  console.log("Executing Real Meta Graph API Analytics Verification...");
  const provider = new MetaInstagramAnalyticsProvider();

  try {
    const mediaInsights = await provider.getMediaInsights(token, mediaId);
    console.log("Successfully fetched Real Media Insights:", mediaInsights);

    const accountInsights = await provider.getAccountInsights(token, accountId);
    console.log("Successfully fetched Real Account Insights:", accountInsights);

    console.log("REAL INSTAGRAM ANALYTICS TEST: PASS");
  } catch (err: unknown) {
    console.error("REAL INSTAGRAM ANALYTICS TEST: FAIL", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
