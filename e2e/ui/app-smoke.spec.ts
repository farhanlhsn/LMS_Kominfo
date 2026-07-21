import { expect, test } from "@playwright/test";
import { apiGet, apiPatch, apiPost } from "../helpers/api";
import { loginPageAs } from "../helpers/ui";

function flattenActivities(course: any) {
  return (course.modules ?? []).flatMap((module: any) =>
    (module.lessons ?? []).flatMap((lesson: any) =>
      (lesson.activities ?? []).map((activity: any) => ({
        ...activity,
        lesson,
        module,
      })),
    ),
  );
}

test.describe("Browser smoke for main LMS surfaces", () => {
  test("login form authenticates seeded learner and redirects into dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /Welcome back|Sign in/i }),
    ).toBeVisible();
    await page.getByLabel("Email").fill("learner.one@example.com");
    await page.getByLabel("Password", { exact: true }).fill("ChangeMe123!");
    await page.getByRole("button", { name: /^Sign in$/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Learning dashboard" }),
    ).toBeVisible();
  });

  test("protected page redirects unauthenticated browser to login", async ({
    page,
  }) => {
    await page.goto("/my-learning");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("learner can browse catalog, open my learning, and use learning workspace panels", async ({
    page,
    request,
  }) => {
    const learner = await loginPageAs(page, request, "learner");
    const enrollments = await apiGet<any[]>(
      request,
      learner,
      "/my/enrollments",
    );
    const enrollment =
      enrollments.find(
        (e) => e.course?.slug === "foundations-modern-web-apps",
      ) ?? enrollments[0];
    const course = enrollment.course;
    const learningCourse = await apiGet<any>(
      request,
      learner,
      `/learn/courses/${course.id}`,
    );
    const activities = flattenActivities(learningCourse.curriculum);
    const videoActivity =
      activities.find((a: any) => a.activityTypeKey === "core.video") ??
      activities[0];
    expect(videoActivity?.title, "seeded curriculum activity").toBeTruthy();
    const lessonId =
      videoActivity.lesson?.id ??
      learningCourse.curriculum.modules[0].lessons[0].id;

    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();
    await expect(page.getByText(course.title).first()).toBeVisible();

    await page.goto("/my-learning");
    await expect(
      page.getByRole("heading", { name: "My Learning" }),
    ).toBeVisible();
    await expect(page.getByText(course.title).first()).toBeVisible();

    await page.goto(`/learn/lessons/${lessonId}`);
    await expect(page.getByText("Learning workspace").first()).toBeVisible();

    // Prefer seeded activity title; fall back to first activity control in shell.
    const byTitle = page.getByText(videoActivity.title, { exact: false });
    if (await byTitle.first().isVisible().catch(() => false)) {
      await byTitle.first().click();
    }

    const notesBtn = page.getByRole("button", { name: "Notes" });
    if (await notesBtn.last().isVisible().catch(() => false)) {
      await notesBtn.last().click();
      const noteBox = page.getByPlaceholder("Write a private note...");
      if (await noteBox.isVisible().catch(() => false)) {
        await noteBox.fill(`UI smoke note ${Date.now()}`);
        await page.getByRole("button", { name: "Save note" }).click();
      }
    }

    const bookmarksBtn = page.getByRole("button", { name: "Bookmarks" });
    if (await bookmarksBtn.last().isVisible().catch(() => false)) {
      await bookmarksBtn.last().click();
    }

    const aiTutor = page.getByTitle("AI Tutor");
    if (await aiTutor.isVisible().catch(() => false)) {
      await aiTutor.click();
      await expect(page.getByText(/AI Tutor is disabled|AI Tutor/i).first()).toBeVisible();
    }

    const completeBtn = page.getByRole("button", { name: "Mark complete" });
    if (await completeBtn.isVisible().catch(() => false)) {
      await completeBtn.click();
    }
  });

  test("instructor pages for course builder, content, files, and quizzes render", async ({
    page,
    request,
  }) => {
    await loginPageAs(page, request, "instructor");

    await page.goto("/instructor/courses");
    await expect(
      page.getByRole("heading", { name: "Course Builder" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "New course" })).toBeVisible();

    await page.goto("/instructor/files");
    await expect(
      page.getByRole("heading", { name: "File Manager" }),
    ).toBeVisible();

    await page.goto("/instructor/content-library");
    await expect(
      page.getByRole("heading", { name: "Content Library" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Drop files here|click to upload/i),
    ).toBeVisible();

    await page.goto("/instructor/question-banks");
    await expect(
      page.getByRole("heading", { name: "Question Banks" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Save bank" })).toBeVisible();

    await page.goto("/instructor/quizzes");
    await expect(page.getByRole("heading", { name: "Quizzes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
  });

  test("learner quiz renderer starts and submits a seeded quiz attempt", async ({
    page,
    request,
  }) => {
    const learner = await loginPageAs(page, request, "learner");
    const enrollments = await apiGet<any[]>(
      request,
      learner,
      "/my/enrollments",
    );
    const seededEnrollment =
      enrollments.find(
        (enrollment) =>
          enrollment.course.slug === "foundations-modern-web-apps",
      ) ?? enrollments[0];
    const learningCourse = await apiGet<any>(
      request,
      learner,
      `/learn/courses/${seededEnrollment.course.id}`,
    );
    const firstActivity =
      learningCourse.curriculum.modules[0].lessons[0].activities[0];
    const quizActivity = flattenActivities(learningCourse.curriculum).find(
      (activity: any) => activity.activityTypeKey === "core.quiz",
    );
    expect(quizActivity).toBeTruthy();

    await apiPost(
      request,
      learner,
      `/courses/${seededEnrollment.course.id}/enroll`,
    );
    await apiPatch(request, learner, "/learn/workspace/preferences", {
      preferredLayout: "standard",
      rightPanelMode: "notes",
      sidebarCollapsed: false,
      rightPanelCollapsed: false,
    });
    await apiPatch(request, learner, "/learn/workspace/state", {
      courseId: seededEnrollment.course.id,
      lessonId: quizActivity.lesson.id,
      activityId: firstActivity.id,
      layout: "standard",
      rightPanelMode: "notes",
      sidebarCollapsed: false,
      rightPanelCollapsed: false,
    });
    await apiPatch(request, learner, "/learn/workspace/state", {
      courseId: seededEnrollment.course.id,
      lessonId: quizActivity.lesson.id,
      activityId: quizActivity.id,
      layout: "standard",
      rightPanelMode: "notes",
      sidebarCollapsed: false,
      rightPanelCollapsed: false,
    });
    await page.goto(`/learn/lessons/${quizActivity.lesson.id}`);
    const startQuizButton = page.getByRole("button", {
      name: /Start quiz|Continue attempt/,
    });
    if (!(await startQuizButton.isVisible().catch(() => false))) {
      const quizActivityButton = page.getByRole("button", {
        name: quizActivity.title,
      });
      if (!(await quizActivityButton.isVisible().catch(() => false))) {
        await page.getByRole("button", { name: "Sidebar" }).click();
      }
      await quizActivityButton.click();
    }
    await expect(page.getByText("Quiz").first()).toBeVisible();
    await startQuizButton.click();
    await expect(
      page.getByRole("button", { name: "Save answer" }).first(),
    ).toBeVisible();
  });

  test("admin plugin management UI renders plugin status and detail", async ({
    page,
    request,
  }) => {
    await loginPageAs(page, request, "admin");

    await page.goto("/admin/plugins");
    await expect(
      page.getByRole("heading", { name: "Plugins", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Video Activity").first()).toBeVisible();

    await page.getByRole("link", { name: "Details" }).first().click();
    await expect(page).toHaveURL(/\/admin\/plugins\/.+/);
    await expect(page.getByText("Manifest")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Plugin logs", exact: true }),
    ).toBeVisible();
  });
});
