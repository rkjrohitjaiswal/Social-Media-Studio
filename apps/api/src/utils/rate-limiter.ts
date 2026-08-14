interface RateLimitStoreEntry {
  tokens: number;
  lastRefill: number;
}

const rateLimitStore = new Map<string, RateLimitStoreEntry>();

if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.lastRefill > 600000) {
        rateLimitStore.delete(key);
      }
    }
  }, 300000);
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    (cleanupTimer as unknown as { unref: () => void }).unref();
  }
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const windowMs = options.windowMs || 60000;
  const max = options.max || 30;
  const now = Date.now();

  let entry = rateLimitStore.get(identifier);

  if (!entry) {
    entry = { tokens: max, lastRefill: now };
    rateLimitStore.set(identifier, entry);
  }

  const elapsed = now - entry.lastRefill;
  if (elapsed > windowMs) {
    entry.tokens = max;
    entry.lastRefill = now;
  }

  if (entry.tokens > 0) {
    entry.tokens -= 1;
    return {
      allowed: true,
      remaining: entry.tokens,
      resetMs: Math.max(0, windowMs - (now - entry.lastRefill)),
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetMs: Math.max(0, windowMs - (now - entry.lastRefill)),
  };
}

export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
