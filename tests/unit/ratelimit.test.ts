import { describe, it, expect } from "vitest";
import { rateLimiter } from "@/lib/ratelimit";

describe("Sliding Window Rate Limiter", () => {
  it("should allow requests under the configured threshold", () => {
    const key = `test-user-${Date.now()}`;
    const limit = 5;
    const windowMs = 5000;

    for (let i = 0; i < limit; i++) {
      const res = rateLimiter.check(key, limit, windowMs);
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(limit - (i + 1));
    }
  });

  it("should block requests when threshold is exceeded", () => {
    const key = `test-blocked-${Date.now()}`;
    const limit = 3;
    const windowMs = 5000;

    rateLimiter.check(key, limit, windowMs);
    rateLimiter.check(key, limit, windowMs);
    rateLimiter.check(key, limit, windowMs);

    const blocked = rateLimiter.check(key, limit, windowMs);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });
});
