import crypto from "crypto";
import { encryptToken, decryptToken } from "../../utils/encryption.js";

export const N8N_WEBHOOK_TIMEOUT_MS = parseInt(process.env.N8N_WEBHOOK_TIMEOUT_MS || "10000", 10);
export const N8N_WEBHOOK_MAX_PAYLOAD_BYTES = parseInt(process.env.N8N_WEBHOOK_MAX_PAYLOAD_BYTES || "65536", 10);
export const N8N_RESPONSE_PREVIEW_MAX_BYTES = parseInt(process.env.N8N_RESPONSE_PREVIEW_MAX_BYTES || "2048", 10);
export const N8N_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = parseInt(
  process.env.N8N_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS || "300",
  10
);

/**
 * Encrypt webhook URL for safe storage at rest
 */
export function encryptWebhookUrl(url: string): string {
  return encryptToken(url);
}

/**
 * Decrypt webhook URL (server-side only)
 */
export function decryptWebhookUrl(encryptedUrl: string): string {
  return decryptToken(encryptedUrl);
}

/**
 * Encrypt signing secret for safe storage at rest
 */
export function encryptSigningSecret(secret: string): string {
  return encryptToken(secret);
}

/**
 * Decrypt signing secret (server-side only)
 */
export function decryptSigningSecret(encryptedSecret: string): string {
  return decryptToken(encryptedSecret);
}

/**
 * Generate a random 256-bit cryptographic signing secret in hex format
 */
export function generateRandomSigningSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate HMAC-SHA256 signature for webhook payload:
 * Signature = "sha256=" + HMAC-SHA256(secret, timestamp + "." + rawPayload)
 */
export function generateWebhookSignature(
  secret: string,
  timestamp: string,
  rawPayload: string
): string {
  const dataToSign = `${timestamp}.${rawPayload}`;
  const hmac = crypto.createHmac("sha256", secret).update(dataToSign).digest("hex");
  return `sha256=${hmac}`;
}

/**
 * Timing-safe signature verification
 */
export function verifyWebhookSignature(
  secret: string,
  timestamp: string,
  rawPayload: string,
  signatureHeader: string
): boolean {
  const expectedSignature = generateWebhookSignature(secret, timestamp, rawPayload);
  
  if (signatureHeader.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader, "utf8"),
    Buffer.from(expectedSignature, "utf8")
  );
}

/**
 * Verify event timestamp against replay tolerance (default 300s)
 */
export function verifyTimestampTolerance(
  timestampIso: string,
  toleranceSeconds: number = N8N_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS
): boolean {
  try {
    const timestampMs = new Date(timestampIso).getTime();
    if (isNaN(timestampMs)) return false;
    const diffMs = Math.abs(Date.now() - timestampMs);
    return diffMs <= toleranceSeconds * 1000;
  } catch {
    return false;
  }
}

/**
 * SSRF & URL Validation Safeguards:
 * - Reject unsupported protocols (only http/https allowed)
 * - Require HTTPS in production
 * - Reject loopback, link-local, private IPv4, and private IPv6 ranges
 */
export function validateWebhookUrl(urlStr: string): { isValid: boolean; error?: string } {
  try {
    const url = new URL(urlStr);

    // 1. Protocol check
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { isValid: false, error: "Unsupported URL protocol. Only HTTP/HTTPS allowed." };
    }

    // 2. Production HTTPS Requirement
    const isProd = process.env.NODE_ENV === "production";
    const allowHttp = process.env.ALLOW_HTTP_WEBHOOKS === "true";
    if (isProd && !allowHttp && url.protocol !== "https:") {
      return { isValid: false, error: "Production webhooks must use HTTPS." };
    }

    const hostname = url.hostname.toLowerCase();

    // 3. Loopback & Localhost check
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0"
    ) {
      if (isProd && !allowHttp) {
        return { isValid: false, error: "SSRF Protection: Localhost/loopback URLs are prohibited." };
      }
    }

    // 4. Private / Link-Local IPv4 Check
    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const octet1 = parseInt(match[1], 10);
      const octet2 = parseInt(match[2], 10);

      // Private ranges
      if (
        octet1 === 10 ||
        (octet1 === 172 && octet2 >= 16 && octet2 <= 31) ||
        (octet1 === 192 && octet2 === 168) ||
        (octet1 === 169 && octet2 === 254) ||
        octet1 === 127
      ) {
        if (isProd && !allowHttp) {
          return { isValid: false, error: "SSRF Protection: Private/internal IP addresses are prohibited." };
        }
      }
    }

    // 5. Private IPv6 check (fe80::, fd00::)
    if (hostname.startsWith("fe80:") || hostname.startsWith("fd") || hostname.startsWith("fc")) {
      if (isProd && !allowHttp) {
        return { isValid: false, error: "SSRF Protection: Private IPv6 addresses are prohibited." };
      }
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: "Invalid URL structure." };
  }
}
