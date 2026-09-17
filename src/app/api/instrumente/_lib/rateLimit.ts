/**
 * Limitare de rată în memorie, per proces. Suficientă pentru instrumente gratuite
 * pe o singură instanță; într-un cluster, cheia ar sta într-un magazin partajat.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;

function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || "local";
  return `${scope}:${ip}`;
}

export function rateLimit(key: string, limit: number, windowMs = WINDOW_MS): { ok: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0, remaining: limit - 1 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((b.resetAt - now) / 1000)), remaining: 0 };
  }
  b.count += 1;
  return { ok: true, retryAfterSeconds: 0, remaining: limit - b.count };
}

export function tooMany(retryAfterSeconds: number, what: string): Response {
  return Response.json(
    { error: `Prea multe ${what} într-un minut. Încearcă din nou în ${retryAfterSeconds} s.` },
    { status: 429, headers: { "retry-after": String(retryAfterSeconds), "cache-control": "no-store" } },
  );
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function errorJson(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}
