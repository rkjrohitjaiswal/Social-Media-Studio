import { lookup } from "node:dns/promises";
import { SocialPlatformProvider, SocialAccountData, PublishParams, PublishResult, PlatformCapability } from "../types";
import { getPlatformCapabilities } from "../capability-registry";
import { decryptSecret } from "../../security/encryption";
import { socialAccountService } from "../account-service";

const X_API = "https://api.x.com/2";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function privateIpv4(address: string): boolean {
  const p = address.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return p[0] === 10 || p[0] === 127 || p[0] === 0 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168);
}

function privateIpv6(address: string): boolean {
  const v = address.toLowerCase();
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80:");
}

async function assertSafeMediaUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("X media URL must use HTTPS");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "metadata.google.internal" || host === "169.254.169.254") throw new Error("X media URL points to a blocked host");
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (addresses.some(({ address }) => privateIpv4(address) || privateIpv6(address))) throw new Error("X media URL resolves to a private network address");
  return url;
}

function classifyError(status: number): string {
  if (status === 401 || status === 403) return "X authorization failed or permission is missing";
  if (status === 429) return "X rate limit or post cap reached; retry later";
  if (status >= 500) return "X service error; retry later";
  return `X API request failed (${status})`;
}

export class XProvider implements SocialPlatformProvider {
  readonly platform = "X" as const;

  getCapabilities(): PlatformCapability[] {
    return getPlatformCapabilities("X");
  }

  private async getValidAccessToken(account: SocialAccountData): Promise<string> {
    if (!account.encryptedAccessToken) throw new Error("X account has no access token");
    const token = decryptSecret(account.encryptedAccessToken);
    if (token.startsWith("mock-")) return token;
    if (!account.tokenExpiresAt || account.tokenExpiresAt.getTime() - Date.now() > 5 * 60 * 1000) return token;
    if (!account.encryptedRefreshToken) throw new Error("X access token expired and no refresh token is available");

    const refreshToken = decryptSecret(account.encryptedRefreshToken);
    const clientId = process.env.X_CLIENT_ID;
    if (!clientId) throw new Error("X_CLIENT_ID is not configured");
    const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId });
    const res = await fetch(`${X_API}/oauth2/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(), cache: "no-store" });
    if (!res.ok) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      throw new Error("X refresh token is invalid or revoked; reauthorization required");
    }
    const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
    await socialAccountService.updateAccountTokens(account.id, account.workspaceId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(Date.now() + (data.expires_in || 7200) * 1000),
    });
    return data.access_token;
  }

  async verifyConnection(account: SocialAccountData): Promise<boolean> {
    try {
      const token = await this.getValidAccessToken(account);
      if (token.startsWith("mock-")) return account.status === "CONNECTED";
      const res = await fetch(`${X_API}/users/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (res.status === 401 || res.status === 403) await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      return res.ok;
    } catch {
      return false;
    }
  }

  private async uploadImage(token: string, mediaUrl: string): Promise<string> {
    const safeUrl = await assertSafeMediaUrl(mediaUrl);
    const mediaRes = await fetch(safeUrl, { cache: "no-store" });
    if (!mediaRes.ok) throw new Error(`Unable to fetch X media (${mediaRes.status})`);
    const contentLength = Number(mediaRes.headers.get("content-length") || "0");
    if (contentLength > MAX_IMAGE_BYTES) throw new Error("X image exceeds 5 MB upload limit");
    const bytes = new Uint8Array(await mediaRes.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("X image exceeds 5 MB upload limit");
    const contentType = (mediaRes.headers.get("content-type") || "image/jpeg").split(";")[0].toLowerCase();
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"]);
    if (!allowed.has(contentType)) throw new Error(`Unsupported X image type: ${contentType}`);

    const init = await fetch(`${X_API}/media/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ media: Buffer.from(bytes).toString("base64"), media_category: "tweet_image", media_type: contentType }),
      cache: "no-store",
    });
    if (!init.ok) throw new Error(classifyError(init.status));
    const payload = (await init.json()) as { data?: { id?: string } };
    const mediaId = payload.data?.id;
    if (!mediaId) throw new Error("X media upload did not return a media ID");
    return mediaId;
  }

  async publish(params: PublishParams): Promise<PublishResult> {
    try {
      const token = await this.getValidAccessToken(params.account);
      let text = (params.content.caption || params.content.description || "").trim();
      if (params.content.contentType === "AFFILIATE_PRODUCT" && !/(^|\s)#(?:ad|affiliate)(?:\s|$)/i.test(text)) text = `${text}\n\n#ad #affiliate`;
      if (!text) throw new Error("X post requires text");
      if (Array.from(text).length > 280) text = `${Array.from(text).slice(0, 277).join("")}...`;

      if (token.startsWith("mock-")) {
        const id = `x-post-${Date.now()}`;
        return { success: true, externalPostId: id, permalink: `https://x.com/i/web/status/${id}`, publishedAt: new Date() };
      }

      let mediaId: string | undefined;
      if (params.mediaUrl) mediaId = await this.uploadImage(token, params.mediaUrl);
      const body: Record<string, unknown> = { text };
      if (mediaId) body.media = { media_ids: [mediaId] };
      const res = await fetch(`${X_API}/tweets`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) await socialAccountService.updateAccountStatus(params.account.id, params.account.workspaceId, "REAUTH_REQUIRED");
        return { success: false, errorMessage: classifyError(res.status) };
      }
      const payload = (await res.json()) as { data?: { id?: string } };
      const id = payload.data?.id;
      if (!id) return { success: false, errorMessage: "X did not return a post ID" };
      return { success: true, externalPostId: id, permalink: `https://x.com/i/web/status/${id}`, publishedAt: new Date() };
    } catch (err: unknown) {
      return { success: false, errorMessage: err instanceof Error ? err.message : "X publishing failed" };
    }
  }
}
