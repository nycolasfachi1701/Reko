// Rate limit de janela fixa, em memória (SPEC §4.2 — login).
//
// ⚠️ Limitação: o store é por instância do processo. No dev e num único
// container isso basta (SPEC decisão #4: até 500 usuários). Em deploy
// multi-instância (Vercel serverless) migrar para um store compartilhado
// (Vercel KV / Redis) mantendo esta mesma assinatura.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
  now: number = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfterSec: 0 };
}

/** Apenas para testes. */
export function _resetRateLimits(): void {
  buckets.clear();
}
