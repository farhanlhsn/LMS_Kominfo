import { describe, expect, it } from "vitest";
import { requestMetrics } from "./request-metrics";

describe("requestMetrics", () => {
  it("records status buckets and latency", () => {
    requestMetrics.begin();
    requestMetrics.end(200, 10, "/api/v1/courses/abc123def456ghi789");
    requestMetrics.begin();
    requestMetrics.end(404, 5, "/api/v1/missing");
    requestMetrics.begin();
    requestMetrics.end(500, 20, "/api/v1/boom");

    const snap = requestMetrics.snapshot();
    expect(snap.requestsTotal).toBeGreaterThanOrEqual(3);
    expect(snap.status2xx).toBeGreaterThanOrEqual(1);
    expect(snap.status4xx).toBeGreaterThanOrEqual(1);
    expect(snap.status5xx).toBeGreaterThanOrEqual(1);
    expect(snap.latencyMs.count).toBeGreaterThanOrEqual(3);
    expect(snap.topPaths.some((p) => p.path.includes(":id") || p.path.includes("courses"))).toBe(
      true,
    );
  });
});
