interface RateLimitRecord {
  timestamps: number[];
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically prune stale entries every 5 minutes
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.prune(), 5 * 60 * 1000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  public check(
    key: string,
    limit: number,
    windowMs: number
  ): {
    success: boolean;
    limit: number;
    remaining: number;
    resetMs: number;
  } {
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Filter out timestamps outside the sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= limit) {
      const oldest = record.timestamps[0];
      const resetMs = Math.max(0, oldest + windowMs - now);
      return {
        success: false,
        limit,
        remaining: 0,
        resetMs,
      };
    }

    record.timestamps.push(now);
    const resetMs = windowMs;

    return {
      success: true,
      limit,
      remaining: limit - record.timestamps.length,
      resetMs,
    };
  }

  private prune() {
    const now = Date.now();
    const maxWindow = 3600 * 1000; // 1 hour max retention
    this.store.forEach((record, key) => {
      record.timestamps = record.timestamps.filter((ts) => ts > now - maxWindow);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    });
  }
}

export const rateLimiter = new InMemoryRateLimiter();

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
