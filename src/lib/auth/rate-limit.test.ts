import { beforeEach, describe, expect, it } from "vitest";
import { _resetRateLimits, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => _resetRateLimits());

  it("permite até o limite e bloqueia depois", () => {
    const key = "k1";
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60, 1000).ok).toBe(true);
    }
    const blocked = rateLimit(key, 5, 60, 1000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("reseta após a janela", () => {
    const key = "k2";
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60, 1000);
    expect(rateLimit(key, 5, 60, 1000).ok).toBe(false);
    // avança além da janela (60s)
    expect(rateLimit(key, 5, 60, 62_000).ok).toBe(true);
  });

  it("chaves distintas não interferem", () => {
    for (let i = 0; i < 5; i++) rateLimit("a", 5, 60, 1000);
    expect(rateLimit("a", 5, 60, 1000).ok).toBe(false);
    expect(rateLimit("b", 5, 60, 1000).ok).toBe(true);
  });
});
