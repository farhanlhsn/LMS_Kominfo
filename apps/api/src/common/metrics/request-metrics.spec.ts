import { describe, expect, it } from "vitest";
import { requestMetrics } from "./request-metrics";

describe("requestMetrics", () => {
  it("tracks begin/end status buckets and path normalization", () => {
    requestMetrics.begin();
    requestMetrics.end(200, 12, "/api/v1/courses/clxxxxxxxxxxxxxxxx");
    requestMetrics.end(404, 5, "/api/v1/users/11111111-2222-3333-4444-555555555555");
    requestMetrics.end(500, 20, "/api/v1/health");
    requestMetrics.end(302, 3, "/api/v1/auth/login");
    const snap = requestMetrics.snapshot();
    expect(snap.requestsTotal).toBeGreaterThanOrEqual(4);
    expect(snap.status2xx).toBeGreaterThanOrEqual(1);
    expect(snap.status4xx).toBeGreaterThanOrEqual(1);
    expect(snap.status5xx).toBeGreaterThanOrEqual(1);
    expect(snap.topPaths.some((p) => p.path.includes(":id"))).toBe(true);
    expect(snap.latencyMs.count).toBeGreaterThan(0);
  });
});
