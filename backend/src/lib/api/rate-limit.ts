/**
 * Rate limiting for the endpoints an anonymous visitor can reach: public
 * submissions and analytics events.
 *
 * Fixed-window counters in process memory. Honest about what that means: it is
 * per-instance, so on multiple serverless instances the effective limit is
 * `limit × instances`. That is adequate for a one-city pilot and keeps the MVP
 * free of an extra dependency; the interface is narrow enough that swapping in
 * Redis or Supabase-backed counters later touches only this file.
 */

export interface RateLimitRule {
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

export const RATE_LIMITS = {
  submission: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 submissions per hour
  analytics: { limit: 120, windowMs: 60 * 1000 }, // 2 events/second sustained
  parse: { limit: 30, windowMs: 60 * 60 * 1000 }, // AI parsing costs money
  report: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitKey = keyof typeof RATE_LIMITS;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
/** Stop the map growing without bound in a long-lived process. */
const MAX_BUCKETS = 10_000;

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(
  rule: RateLimitKey,
  identifier: string,
  now = Date.now(),
): RateLimitResult {
  const { limit, windowMs } = RATE_LIMITS[rule];
  const key = `${rule}:${identifier}`;

  if (buckets.size > MAX_BUCKETS) sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfter: 0 };
}

export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Best-effort client identity: the authenticated user if there is one,
 * otherwise the forwarded IP. Spoofable headers are only ever used for
 * rate limiting, never for authorisation.
 */
export function rateLimitIdentity(request: Request, userId: string | null): string {
  if (userId) return `user:${userId}`;
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}
