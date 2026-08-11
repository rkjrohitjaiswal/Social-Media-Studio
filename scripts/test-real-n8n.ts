import { N8nWebhookProvider } from "../src/lib/integrations/n8n/n8n-webhook-provider";
import { generateRandomSigningSecret } from "../src/lib/integrations/n8n/security";

async function runRealN8nTest() {
  const shouldRun = process.env.RUN_REAL_N8N_TEST === "true";
  const webhookUrl = process.env.N8N_TEST_WEBHOOK_URL;

  if (!shouldRun || !webhookUrl) {
    console.log("==================================================");
    console.log("[SKIP] Real n8n integration test skipped.");
    console.log("To run real n8n test, configure environment:");
    console.log("  RUN_REAL_N8N_TEST=true");
    console.log("  N8N_TEST_WEBHOOK_URL=https://your-n8n-instance/webhook/test");
    console.log("==================================================");
    process.exit(0);
  }

  console.log("==================================================");
  console.log("Starting Real N8n Webhook Integration Test...");
  console.log(`Endpoint: ${webhookUrl}`);
  console.log("==================================================");

  const provider = new N8nWebhookProvider();
  const secret = generateRandomSigningSecret();
  const eventId = `evt-real-${Date.now()}`;
  const occurredAt = new Date().toISOString();

  const payload = {
    eventId,
    eventType: "integration.test",
    occurredAt,
    workspaceId: "ws-real-test",
    data: {
      message: "AI Social Media Studio real n8n webhook integration test",
      timestamp: occurredAt,
    },
  };

  try {
    const result = await provider.sendWebhook({
      rawWebhookUrl: webhookUrl,
      signingSecret: secret,
      eventId,
      eventType: "integration.test",
      occurredAt,
      payload,
    });

    console.log("Result:", JSON.stringify(result, null, 2));

    if (result.success) {
      console.log("✅ Real n8n webhook delivered successfully!");
      process.exit(0);
    } else {
      console.error(`❌ Real n8n webhook failed: ${result.errorMessage}`);
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error("❌ Exception during real n8n test:", err);
    process.exit(1);
  }
}

runRealN8nTest();
