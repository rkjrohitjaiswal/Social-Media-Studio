import {
  generateWebhookSignature,
  validateWebhookUrl,
  N8N_WEBHOOK_TIMEOUT_MS,
  N8N_RESPONSE_PREVIEW_MAX_BYTES,
  N8N_WEBHOOK_MAX_PAYLOAD_BYTES,
} from "./security";

export type N8nErrorClassification =
  | "SUCCESS"
  | "TIMEOUT"
  | "NETWORK"
  | "RATE_LIMIT"
  | "SERVER_ERROR"
  | "CLIENT_ERROR"
  | "INVALID_URL"
  | "DISABLED"
  | "AUTHENTICATION";

export interface N8nDeliveryResult {
  success: boolean;
  classification: N8nErrorClassification;
  isRetryable: boolean;
  httpStatus?: number;
  responsePreview?: string;
  errorMessage?: string;
  deliveredAt?: string;
}

export interface SendWebhookParams {
  rawWebhookUrl: string; // Decrypted URL
  signingSecret: string; // Decrypted secret
  eventId: string;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export class N8nWebhookProvider {
  async sendWebhook(params: SendWebhookParams): Promise<N8nDeliveryResult> {
    // 1. Validate URL & SSRF Check
    const urlValidation = validateWebhookUrl(params.rawWebhookUrl);
    if (!urlValidation.isValid) {
      return {
        success: false,
        classification: "INVALID_URL",
        isRetryable: false,
        errorMessage: urlValidation.error || "Invalid webhook URL",
      };
    }

    // 2. Prepare Payload & Size Validation
    const jsonPayloadStr = JSON.stringify(params.payload);
    const payloadBytes = Buffer.byteLength(jsonPayloadStr, "utf8");

    if (payloadBytes > N8N_WEBHOOK_MAX_PAYLOAD_BYTES) {
      return {
        success: false,
        classification: "CLIENT_ERROR",
        isRetryable: false,
        errorMessage: `Payload size (${payloadBytes} bytes) exceeds maximum limit (${N8N_WEBHOOK_MAX_PAYLOAD_BYTES} bytes)`,
      };
    }

    // 3. Generate Timestamp & HMAC Signature
    const timestamp = new Date().toISOString();
    const signature = generateWebhookSignature(params.signingSecret, timestamp, jsonPayloadStr);

    // 4. Execute HTTP POST with Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), N8N_WEBHOOK_TIMEOUT_MS);

    try {
      const response = await fetch(params.rawWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AI-Studio-Event-Id": params.eventId,
          "X-AI-Studio-Event-Type": params.eventType,
          "X-AI-Studio-Timestamp": timestamp,
          "X-AI-Studio-Signature": signature,
          "User-Agent": "AI-Social-Media-Studio-N8n-Worker/1.0",
        },
        body: jsonPayloadStr,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const httpStatus = response.status;
      const rawText = await response.text();
      const responsePreview = rawText.substring(0, N8N_RESPONSE_PREVIEW_MAX_BYTES);

      // Classification logic
      if (response.ok) {
        return {
          success: true,
          classification: "SUCCESS",
          isRetryable: false,
          httpStatus,
          responsePreview,
          deliveredAt: new Date().toISOString(),
        };
      }

      if (httpStatus === 429) {
        return {
          success: false,
          classification: "RATE_LIMIT",
          isRetryable: true,
          httpStatus,
          responsePreview,
          errorMessage: "n8n Webhook rate limit exceeded (HTTP 429)",
        };
      }

      if (httpStatus === 401 || httpStatus === 403) {
        return {
          success: false,
          classification: "AUTHENTICATION",
          isRetryable: false,
          httpStatus,
          responsePreview,
          errorMessage: `n8n Webhook authentication failed (HTTP ${httpStatus})`,
        };
      }

      if (httpStatus >= 500) {
        return {
          success: false,
          classification: "SERVER_ERROR",
          isRetryable: true,
          httpStatus,
          responsePreview,
          errorMessage: `n8n Webhook server error (HTTP ${httpStatus})`,
        };
      }

      // Other 4xx errors (400, 404, 422, etc.) -> permanent client error
      return {
        success: false,
        classification: "CLIENT_ERROR",
        isRetryable: false,
        httpStatus,
        responsePreview,
        errorMessage: `n8n Webhook client error (HTTP ${httpStatus})`,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        return {
          success: false,
          classification: "TIMEOUT",
          isRetryable: true,
          errorMessage: `n8n Webhook request timed out after ${N8N_WEBHOOK_TIMEOUT_MS}ms`,
        };
      }

      return {
        success: false,
        classification: "NETWORK",
        isRetryable: true,
        errorMessage: err instanceof Error ? err.message : "n8n Webhook network request failed",
      };
    }
  }
}
