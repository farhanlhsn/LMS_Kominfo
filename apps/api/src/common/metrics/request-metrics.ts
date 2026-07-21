export type RequestMetricsSnapshot = {
  startedAt: string;
  uptimeSeconds: number;
  requestsTotal: number;
  requestsInFlight: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  latencyMs: {
    count: number;
    sum: number;
    avg: number;
    p50: number;
    p95: number;
    max: number;
  };
  topPaths: Array<{ path: string; count: number }>;
};

/** Process-local request metrics (Prometheus-style later if needed). */
class RequestMetrics {
  private readonly startedAt = Date.now();
  private total = 0;
  private inFlight = 0;
  private s2 = 0;
  private s3 = 0;
  private s4 = 0;
  private s5 = 0;
  private readonly latencies: number[] = [];
  private readonly pathCounts = new Map<string, number>();
  private static readonly MAX_SAMPLES = 2000;
  private static readonly MAX_PATHS = 100;

  begin() {
    this.inFlight += 1;
  }

  end(statusCode: number, durationMs: number, path: string) {
    this.inFlight = Math.max(0, this.inFlight - 1);
    this.total += 1;
    if (statusCode >= 500) this.s5 += 1;
    else if (statusCode >= 400) this.s4 += 1;
    else if (statusCode >= 300) this.s3 += 1;
    else this.s2 += 1;

    this.latencies.push(durationMs);
    if (this.latencies.length > RequestMetrics.MAX_SAMPLES) {
      this.latencies.splice(0, this.latencies.length - RequestMetrics.MAX_SAMPLES);
    }

    const key = normalizePath(path);
    this.pathCounts.set(key, (this.pathCounts.get(key) ?? 0) + 1);
    if (this.pathCounts.size > RequestMetrics.MAX_PATHS) {
      // drop least frequent
      let minKey = key;
      let min = Infinity;
      for (const [k, v] of this.pathCounts) {
        if (v < min) {
          min = v;
          minKey = k;
        }
      }
      if (minKey !== key) this.pathCounts.delete(minKey);
    }
  }

  snapshot(): RequestMetricsSnapshot {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    return {
      startedAt: new Date(this.startedAt).toISOString(),
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      requestsTotal: this.total,
      requestsInFlight: this.inFlight,
      status2xx: this.s2,
      status3xx: this.s3,
      status4xx: this.s4,
      status5xx: this.s5,
      latencyMs: {
        count,
        sum,
        avg: count ? Math.round(sum / count) : 0,
        p50: percentile(sorted, 0.5),
        p95: percentile(sorted, 0.95),
        max: count ? sorted[count - 1]! : 0,
      },
      topPaths: [...this.pathCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, c]) => ({ path, count: c })),
    };
  }
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[idx]!;
}

function normalizePath(path: string): string {
  const bare = (path.split("?")[0] ?? path).replace(/\/api\/v1/, "") || "/";
  // collapse cuid/uuid-ish segments
  return bare
    .split("/")
    .map((seg) =>
      /^[a-z0-9_-]{16,}$/i.test(seg) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(seg)
        ? ":id"
        : seg,
    )
    .join("/");
}

export const requestMetrics = new RequestMetrics();
