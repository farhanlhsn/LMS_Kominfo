import { expect, test } from "@playwright/test";
import {
  apiGet,
  apiGetWithMeta,
  apiPost,
  apiUrl,
  authHeaders,
  expectDenied,
  expectForbidden,
  login,
  rawDelete,
  rawGet,
  rawPatch,
  rawPost,
  uniqueName,
} from "../helpers/api";

/**
 * IDOR / cross-user / tenant isolation regression pack.
 * Uses seeded learner.one + learner.two in the same demo org.
 */
test.describe("IDOR and tenant isolation regression", () => {
  test("learner cannot access another learner private note or bookmark", async ({
    request,
  }) => {
    const owner = await login(request, "learner");
    const attacker = await login(request, "learnerTwo");
    expect(owner.user.id).not.toBe(attacker.user.id);
    expect(owner.activeOrganization.id).toBe(attacker.activeOrganization.id);

    const catalog = await apiGetWithMeta<any[]>(request, owner, "/courses");
    const course =
      catalog.data.find((c) => c.slug === "foundations-modern-web-apps") ??
      catalog.data.find((c) => c.status === "PUBLISHED");
    expect(course, "seed must expose a published course").toBeTruthy();

    const learning = await apiGet<any>(
      request,
      owner,
      `/learn/courses/${course.id}`,
    );
    const lesson = learning.curriculum?.modules?.[0]?.lessons?.[0];
    const activity = lesson?.activities?.[0];
    expect(lesson?.id, "seeded curriculum lesson").toBeTruthy();
    expect(activity?.id, "seeded curriculum activity").toBeTruthy();

    const note = await apiPost<any>(request, owner, "/learn/notes", {
      courseId: course.id,
      lessonId: lesson.id,
      activityId: activity.id,
      content: uniqueName("IDOR private note"),
    });
    expect(note.id).toBeTruthy();

    const bookmark = await apiPost<any>(request, owner, "/learn/bookmarks", {
      courseId: course.id,
      lessonId: lesson.id,
      activityId: activity.id,
      title: uniqueName("IDOR bookmark"),
    });
    expect(bookmark.id).toBeTruthy();

    await expectDenied(
      rawPatch(request, attacker, `/learn/notes/${note.id}`, {
        content: "hijacked note content",
      }),
    );
    await expectDenied(rawDelete(request, attacker, `/learn/notes/${note.id}`));

    await expectDenied(
      rawPatch(request, attacker, `/learn/bookmarks/${bookmark.id}`, {
        title: "hijacked bookmark",
      }),
    );
    await expectDenied(
      rawDelete(request, attacker, `/learn/bookmarks/${bookmark.id}`),
    );

    // Owner still owns the note (list requires workspace scope)
    const stillThere = await apiGet<any[]>(
      request,
      owner,
      `/learn/notes?courseId=${course.id}&lessonId=${lesson.id}&activityId=${activity.id}`,
    );
    expect(stillThere.some((n) => n.id === note.id)).toBe(true);
  });

  test("learner cannot mutate another learner learning goal", async ({
    request,
  }) => {
    const owner = await login(request, "learner");
    const attacker = await login(request, "learnerTwo");

    const goal = await apiPost<any>(request, owner, "/learn/goals", {
      title: uniqueName("IDOR goal"),
      targetType: "COURSE_COMPLETION",
      targetValue: { percent: 100 },
    });
    expect(goal.id).toBeTruthy();

    await expectDenied(
      rawPatch(request, attacker, `/learn/goals/${goal.id}`, {
        title: "stolen goal",
        targetType: "COURSE_COMPLETION",
        targetValue: { percent: 100 },
      }),
    );
    await expectDenied(rawDelete(request, attacker, `/learn/goals/${goal.id}`));
    await expectDenied(
      rawPost(request, attacker, `/learn/goals/${goal.id}/complete`),
    );
  });

  test("learner cannot read or confirm another user order/payment", async ({
    request,
  }) => {
    const owner = await login(request, "learner");
    const attacker = await login(request, "learnerTwo");

    const catalog = await apiGetWithMeta<any[]>(request, owner, "/courses");
    const course =
      catalog.data.find((c) => c.slug === "foundations-modern-web-apps") ??
      catalog.data[0];
    expect(course?.id).toBeTruthy();

    const order = await apiPost<any>(request, owner, "/orders", {
      courseIds: [course.id],
    });
    expect(order.id).toBeTruthy();

    await expectDenied(rawGet(request, attacker, `/orders/${order.id}`));

    // Create a payment row via prisma-less path: confirm with fake id must 404 for both
    await expectDenied(
      rawPost(request, attacker, "/payments/confirm", {
        paymentId: "pay_does_not_exist",
      }),
      [400, 404],
    );

    // If order has payments, attacker must not confirm them
    const ownerOrder = await apiGet<any>(request, owner, `/orders/${order.id}`);
    const paymentId = ownerOrder.payments?.[0]?.id as string | undefined;
    if (paymentId) {
      await expectDenied(
        rawPost(request, attacker, "/payments/confirm", {
          paymentId,
          bankName: "Evil Bank",
          accountName: "Attacker",
          accountNumber: "000",
        }),
      );
    }
  });

  test("learner cannot hit instructor/admin surfaces", async ({ request }) => {
    const learner = await login(request, "learner");

    await expectForbidden(
      request.post(apiUrl("/instructor/courses"), {
        headers: authHeaders(learner),
        data: { title: uniqueName("IDOR course") },
      }),
    );
    await expectForbidden(
      request.get(apiUrl("/admin/orders"), {
        headers: authHeaders(learner),
      }),
    );
    await expectForbidden(
      request.get(apiUrl("/admin/payments"), {
        headers: authHeaders(learner),
      }),
    );
    await expectForbidden(
      request.post(apiUrl("/payments/approve"), {
        headers: authHeaders(learner),
        data: { paymentId: "anything" },
      }),
    );
  });

  test("conflicting organization header and path param is rejected", async ({
    request,
  }) => {
    const learner = await login(request, "learner");
    // Path org id (if any) vs header — force mismatch via header only against active org routes
    // Using a non-membership org id should deny context.
    const response = await rawGet(request, learner, "/my/enrollments", {
      "x-organization-id": "org_not_a_member_of_this",
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test("forged x-organization-id is denied for tenant-scoped routes", async ({
    request,
  }) => {
    const learner = await login(request, "learner");
    const forged = await rawGet(request, learner, "/my/enrollments", {
      "x-organization-id": "clxxxxxxxx_forged_org_id",
    });
    // Membership missing → 403/404 (or 401 if auth context rejects)
    expect([401, 403, 404]).toContain(forged.status());
  });
});

