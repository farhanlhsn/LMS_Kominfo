import { expect, test } from "@playwright/test";
import {
  apiGet,
  apiPatch,
  apiPost,
  apiUrl,
  authHeaders,
  expectForbidden,
  login,
} from "../helpers/api";

test.describe("Phase 04 plugin foundation", () => {
  test("admin can list, inspect, configure, disable, and enable organization plugins", async ({
    request,
  }) => {
    const admin = await login(request, "admin");

    const plugins = await apiGet<any[]>(request, admin, "/admin/plugins");
    expect(plugins.length).toBeGreaterThan(0);

    const coreText = plugins.find((plugin) => plugin.key === "core.text");
    expect(coreText).toBeTruthy();
    expect(coreText.category).toBe("ACTIVITY");

    const detail = await apiGet<any>(
      request,
      admin,
      `/admin/plugins/${encodeURIComponent(coreText.key)}`,
    );
    expect(detail.key).toBe("core.text");

    await apiPatch(
      request,
      admin,
      `/admin/plugins/${encodeURIComponent(coreText.key)}/config`,
      {
        config: {
          e2e: true,
        },
      },
    );

    const disabled = await apiPost<any>(
      request,
      admin,
      `/admin/plugins/${encodeURIComponent(coreText.key)}/disable`,
    );
    expect(disabled.enabled).toBe(false);

    const enabled = await apiPost<any>(
      request,
      admin,
      `/admin/plugins/${encodeURIComponent(coreText.key)}/enable`,
    );
    expect(enabled.enabled).toBe(true);

    const logs = await apiGet<any[]>(
      request,
      admin,
      `/admin/plugins/${encodeURIComponent(coreText.key)}/logs`,
    );
    expect(logs.some((log) => String(log.action).includes("plugin."))).toBe(true);
  });

  test("activity type registry exposes implemented core renderers and learner cannot manage plugins", async ({
    request,
  }) => {
    const learner = await login(request, "learner");

    const result = await apiGet<{ organizationId: string; activityTypes: any[] }>(
      request,
      learner,
      "/plugins/activity-types",
    );
    const keys = result.activityTypes.map((activityType) => activityType.key);
    expect(keys).toEqual(expect.arrayContaining(["core.text", "core.video", "core.file", "core.link", "core.quiz"]));

    await expectForbidden(
      request.post(apiUrl("/admin/plugins/core.text/disable"), {
        headers: authHeaders(learner),
      }),
    );
  });
});
