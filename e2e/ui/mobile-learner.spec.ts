import { expect, test } from "@playwright/test";
import { apiGet } from "../helpers/api";
import { loginPageAs } from "../helpers/ui";

/**
 * Phase 8.7 P2 — mobile viewport learner journey.
 * Auth via seeded API session (same pattern as other UI e2e) so the suite
 * validates mobile layout of catalog / my-learning / workspace, not form a11y.
 */
test.describe("Mobile learner journey", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("learner reaches catalog, my learning, and lesson workspace on mobile", async ({
    page,
    request,
  }) => {
    const learner = await loginPageAs(page, request, "learner");
    const enrollments = await apiGet<any[]>(request, learner, "/my/enrollments");
    expect(enrollments.length).toBeGreaterThan(0);
    const courseTitle = enrollments[0].course.title as string;

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Learning dashboard" }),
    ).toBeVisible();

    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();
    await expect(page.getByText(courseTitle).first()).toBeVisible();

    await page.goto("/my-learning");
    await expect(
      page.getByRole("heading", { name: "My Learning" }),
    ).toBeVisible();
    await expect(page.getByText(courseTitle).first()).toBeVisible();

    const learning = await apiGet<any>(
      request,
      learner,
      `/learn/courses/${enrollments[0].course.id}`,
    );
    const lessonId = learning.curriculum?.modules?.[0]?.lessons?.[0]?.id;
    expect(lessonId).toBeTruthy();

    await page.goto(`/learn/lessons/${lessonId}`);
    await expect(page.getByText("Learning workspace").first()).toBeVisible();
  });
});
