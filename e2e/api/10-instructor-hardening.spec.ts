import { expect, test } from "@playwright/test";
import { apiGet, apiPost, expectDenied, expectForbidden, login, rawGet, uniqueName } from "../helpers/api";

test.describe("Instructor hardening", () => {
  test("learner cannot access instructor gradebook, roster, or announcement surfaces", async ({ request }) => {
    const learner = await login(request, "learner");
    const courses = await apiGet<any[]>(request, learner, "/courses");
    const course = courses.find((item) => item.status === "PUBLISHED");
    expect(course?.id).toBeTruthy();
    await expectDenied(rawGet(request, learner, `/instructor/courses/${course.id}/gradebook`));
    await expectDenied(rawGet(request, learner, `/instructor/courses/${course.id}/roster`));
    await expectForbidden(request.post(`${process.env.E2E_API_URL ?? "http://localhost:4000/api/v1"}/discussions`, {
      headers: { Authorization: `Bearer ${learner.accessToken}`, "x-organization-id": learner.activeOrganization.id },
      data: { courseId: course.id, title: uniqueName("blocked announcement"), body: "blocked" },
    }));
  });
});
