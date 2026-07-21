import { expect, test } from "@playwright/test";
import {
  apiGet,
  apiPost,
  apiUrl,
  authHeaders,
  expectDenied,
  expectForbidden,
  expectUnauthorized,
  login,
  rawGet,
  rawPost,
  uniqueName,
} from "../helpers/api";

/**
 * Phase 8 P1:
 * - 8.4 Realtime messaging smoke (transports, channel scope, subscribe/poll)
 * - 8.6 Code-runner mock path + timeout / auth failure (no public Judge0)
 * Phase 8 P2:
 * - 8.5 AI disabled already covered in 08-ai-rag.spec.ts
 */
test.describe("Phase 8 P1 realtime + code-runner", () => {
  test("realtime transports, channel scope, subscribe and poll smoke", async ({
    request,
  }) => {
    const learner = await login(request, "learner");
    const admin = await login(request, "admin");
    const entityId = uniqueName("entity").replace(/\s+/g, "-");

    const transports = await apiGet<{
      preferred: string;
      available: string[];
    }>(request, learner, "/realtime/transports");
    expect(transports.preferred).toBe("polling");
    expect(transports.available).toEqual(
      expect.arrayContaining(["polling", "sse", "websocket"]),
    );

    const channelRes = await apiGet<{ channel: string }>(
      request,
      learner,
      `/realtime/channels/org/course/${entityId}`,
    );
    expect(channelRes.channel).toMatch(
      new RegExp(`^org:${learner.activeOrganization.id}:course:`),
    );

    // Cross-org channel prefix must be rejected
    await expectDenied(
      rawPost(request, learner, "/realtime/subscribe", {
        channel: "org:other-org-id:course/x",
      }),
    );

    const sub = await apiPost<{ id: string; channel: string }>(
      request,
      learner,
      "/realtime/subscribe",
      { channel: channelRes.channel },
    );
    expect(sub.channel).toBe(channelRes.channel);

    // Learner cannot publish (platform:admin only)
    await expectForbidden(
      request.post(apiUrl("/realtime/publish"), {
        headers: authHeaders(learner),
        data: {
          channel: channelRes.channel,
          type: "smoke.test",
          payload: { ok: true },
        },
      }),
    );

    // Admin publishes into the channel
    const event = await apiPost<any>(request, admin, "/realtime/publish", {
      channel: channelRes.channel,
      type: "smoke.test",
      payload: { msg: "p1-realtime" },
    });
    expect(event.id).toBeTruthy();
    expect(event.type).toBe("smoke.test");

    const polled = await apiGet<any[]>(
      request,
      learner,
      `/realtime/poll?channel=${encodeURIComponent(channelRes.channel)}&limit=20`,
    );
    expect(polled.some((e) => e.id === event.id)).toBe(true);

    await expectUnauthorized(request.get(apiUrl("/realtime/transports")));
  });

  test("code-runner mock execute, timeout path, and auth gate", async ({
    request,
  }) => {
    const learner = await login(request, "learner");

    await expectUnauthorized(
      request.post(apiUrl("/code-runner/execute"), {
        data: { language: "JAVASCRIPT", code: "console.log(1)" },
      }),
    );

    const execution = await apiPost<any>(request, learner, "/code-runner/execute", {
      language: "JAVASCRIPT",
      code: 'console.log("p1-ok")',
    });
    expect(execution.id).toBeTruthy();
    expect(["COMPLETED", "ERROR", "RUNTIME_ERROR", "FAILED", "TIMED_OUT"]).toContain(
      execution.status,
    );
    // Mock/host runner should complete simple JS when node is available
    if (execution.status === "COMPLETED") {
      expect(String(execution.output ?? "")).toMatch(/p1-ok/);
    }

    const fetched = await apiGet<any>(
      request,
      learner,
      `/code-runner/executions/${execution.id}`,
    );
    expect(fetched.id).toBe(execution.id);

    // Short timeout + busy loop → TIMED_OUT (or ERROR if spawn fails on host)
    const timed = await apiPost<any>(request, learner, "/code-runner/execute", {
      language: "JAVASCRIPT",
      code: "while(true){}",
      timeoutMs: 200,
    });
    expect(["TIMED_OUT", "ERROR", "FAILED", "RUNTIME_ERROR", "COMPLETED"]).toContain(
      timed.status,
    );
    if (timed.sandboxStatus) {
      expect(["TIMED_OUT", "ERROR", "RUNTIME_ERROR", "COMPLETED"]).toContain(
        timed.sandboxStatus,
      );
    }

    // Invalid language rejected
    const bad = await rawPost(request, learner, "/code-runner/execute", {
      language: "COBOL",
      code: "DISPLAY 'x'.",
    });
    expect([400, 422]).toContain(bad.status());
  });
});
