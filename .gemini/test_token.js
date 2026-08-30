import crypto from "crypto";

const SESSION_SECRET = "ai-social-studio-admin-secret-key-2026";
const userId = "admin_user_123456";
const email = "admin@studio.ai";
const now = new Date();

const payload = `${userId}:${email}:${now.getTime()}`;
const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
const token = `adm_${Buffer.from(payload).toString("base64url")}.${signature}`;

console.log("Generated Token:", token);

// Verify stateless token
const raw = token.substring(4);
const [payloadB64, sig] = raw.split(".");
const decodedPayload = Buffer.from(payloadB64, "base64url").toString("utf8");
console.log("Decoded Payload:", decodedPayload);

const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(decodedPayload).digest("hex");
console.log("Signature Match:", sig === expectedSig);

try {
  const match = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  console.log("timingSafeEqual match:", match);
} catch (err) {
  console.error("timingSafeEqual error:", err.message);
}
