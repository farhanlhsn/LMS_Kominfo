import { expect, test } from "@playwright/test";
import {
  authHeaders,
  apiUrl,
  expectForbidden,
  expectUnauthorized,
  login,
  seededUsers,
  unwrap,
} from "../helpers/api";

test.describe("Phase 00-01 foundation, auth, RBAC, and tenant context", () => {
  test("health endpoint responds with standard API envelope", async ({ request }) => {
    const health = await unwrap<{
      status: string;
      service: string;
      dependencies: Record<string, string>;
    }>(await request.get(apiUrl("/health")));

    expect(["ok", "degraded"]).toContain(health.status);
    expect(health.service).toBe("api");
    expect(["ok", "configured", "missing", "error"]).toContain(
      health.dependencies.database,
    );
  });

  test("seeded learner, instructor, and admin can log in and hydrate current user", async ({
    request,
  }) => {
    for (const role of Object.keys(seededUsers) as Array<keyof typeof seededUsers>) {
      const session = await login(request, role);
      expect(session.user.email).toBe(seededUsers[role].email);
      expect(session.activeOrganization.id).toBeTruthy();
      expect(session.accessToken).toBeTruthy();
      expect(session.refreshToken).toBeTruthy();
    }
  });

  test("protected APIs reject unauthenticated requests", async ({ request }) => {
    await expectUnauthorized(request.get(apiUrl("/auth/me")));
    await expectUnauthorized(request.get(apiUrl("/my/enrollments")));
  });

  test("learner cannot perform instructor write/admin actions", async ({ request }) => {
    const learner = await login(request, "learner");

    await expectForbidden(
      request.post(apiUrl("/instructor/courses"), {
        headers: authHeaders(learner),
        data: {
          title: "Forbidden learner course",
        },
      }),
    );

    await expectForbidden(
      request.get(apiUrl("/admin/plugins"), {
        headers: authHeaders(learner),
      }),
    );
  });

  test("tenant-scoped APIs can resolve organization context from the access token", async ({
    request,
  }) => {
    const learner = await login(request, "learner");
    const response = await request.get(apiUrl("/my/enrollments"), {
      headers: {
        Authorization: `Bearer ${learner.accessToken}`,
      },
    });

    expect(response.status()).toBe(200);
  });
});
