import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  return Buffer.from(key.substring(0, 64), "hex");
}

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptToken(encryptedString: string): string {
  const parts = encryptedString.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const [ivHex, authTagHex, encryptedTextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedTextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export const encryptSecret = encryptToken;
export const decryptSecret = decryptToken;

export function generatePKCEChallenge(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function generateSignedOAuthState(
  workspaceId: string,
  userId: string,
  extraPayload?: Record<string, unknown>
): string {
  const payload = {
    workspaceId,
    userId,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(8).toString("hex"),
    ...extraPayload,
  };
  const jsonStr = JSON.stringify(payload);
  const key = getEncryptionKey();
  const hmac = crypto.createHmac("sha256", key).update(jsonStr).digest("hex");
  return Buffer.from(`${jsonStr}::${hmac}`).toString("base64url");
}

export function verifyOAuthState(stateStr: string): {
  workspaceId: string;
  userId: string;
  codeVerifier?: string;
  [key: string]: unknown;
} {
  const decoded = Buffer.from(stateStr, "base64url").toString("utf8");
  const [jsonStr, hmac] = decoded.split("::");
  if (!jsonStr || !hmac) {
    throw new Error("Invalid OAuth state structure");
  }

  const key = getEncryptionKey();
  const expectedHmac = crypto.createHmac("sha256", key).update(jsonStr).digest("hex");
  if (hmac !== expectedHmac) {
    throw new Error("CSRF alert: OAuth state signature mismatch");
  }

  const payload = JSON.parse(jsonStr);
  const ageMs = Date.now() - payload.timestamp;
  if (ageMs > 10 * 60 * 1000) {
    throw new Error("OAuth state expired (older than 10 minutes)");
  }

  return payload;
}
