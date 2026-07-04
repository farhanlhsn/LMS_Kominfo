import { expect, test } from "@playwright/test";
import {
  apiDelete,
  apiGet,
  apiGetWithMeta,
  apiPatch,
  apiPost,
  login,
  uniqueName,
} from "../helpers/api";

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

test.describe("Phase 02, 03, and 05 learner LMS flow", () => {
  test("catalog, enrollment, learning page, rich content, progress, workspace data all work from APIs", async ({
    request,
  }) => {
    const learner = await login(request, "learner");

    const catalog = await apiGetWithMeta<any[]>(request, learner, "/courses");
    expect(catalog.data.length).toBeGreaterThan(0);

    const publishedCourse =
      catalog.data.find((course) => course.slug === "foundations-modern-web-apps") ??
      catalog.data.find((course) => course.status === "PUBLISHED");
    expect(publishedCourse, "seed must expose at least one published course").toBeTruthy();

    const detail = await apiGet<any>(
      request,
      learner,
      `/courses/${encodeURIComponent(publishedCourse.slug ?? publishedCourse.id)}`,
    );
    expect(detail.id).toBe(publishedCourse.id);

    const curriculum = await apiGet<any>(
      request,
      learner,
      `/courses/${publishedCourse.id}/curriculum`,
    );
    const activities = flattenActivities(curriculum);
    expect(activities.length).toBeGreaterThan(0);

    for (const type of ["core.text", "core.video", "core.link", "core.file"]) {
      expect(
        activities.some((activity: any) => activity.activityTypeKey === type),
        `${type} activity must be present in seeded curriculum`,
      ).toBe(true);
    }

    const enrollment = await apiPost<any>(
      request,
      learner,
      `/courses/${publishedCourse.id}/enroll`,
    );
    expect(enrollment.courseId).toBe(publishedCourse.id);

    const enrollments = await apiGet<any[]>(request, learner, "/my/enrollments");
    expect(enrollments.some((item) => item.course.id === publishedCourse.id)).toBe(true);

    const learningCourse = await apiGet<any>(
      request,
      learner,
      `/learn/courses/${publishedCourse.id}`,
    );
    expect(learningCourse.curriculum.id).toBe(publishedCourse.id);

    const firstLesson = curriculum.modules[0].lessons[0];
    const lesson = await apiGet<any>(
      request,
      learner,
      `/learn/lessons/${firstLesson.id}`,
    );
    expect(lesson.id).toBe(firstLesson.id);

    const lessonActivities = flattenActivities({ modules: [{ lessons: [lesson] }] });
    for (const activity of lessonActivities) {
      const content = await apiGet<any>(
        request,
        learner,
        `/learn/activities/${activity.id}/content`,
      );
      expect(content.activity.id).toBe(activity.id);
      expect(content.content).toBeTruthy();
    }

    const nonQuizActivity = activities.find(
      (activity: any) => activity.activityTypeKey !== "core.quiz",
    );
    expect(nonQuizActivity).toBeTruthy();
    await apiPost<any>(
      request,
      learner,
      `/learn/activities/${nonQuizActivity.id}/start`,
    );
    const completion = await apiPost<any>(
      request,
      learner,
      `/learn/activities/${nonQuizActivity.id}/complete`,
    );
    expect(completion.activityProgress.status).toBe("COMPLETED");
    expect(completion.courseProgress.progressPercent).toBeGreaterThanOrEqual(0);

    const preferences = await apiPatch<any>(
      request,
      learner,
      "/learn/workspace/preferences",
      {
        preferredLayout: "split_content_notes",
        rightPanelMode: "notes",
        sidebarCollapsed: false,
      },
    );
    expect(preferences.preferredLayout).toBe("split_content_notes");

    const state = await apiPatch<any>(
      request,
      learner,
      "/learn/workspace/state",
      {
        courseId: publishedCourse.id,
        lessonId: firstLesson.id,
        activityId: nonQuizActivity.id,
        layout: "focus",
        rightPanelMode: "notes",
        sidebarCollapsed: true,
        rightPanelCollapsed: false,
        lastVideoTimeSeconds: 3,
      },
    );
    expect(state.layout).toBe("focus");

    const note = await apiPost<any>(request, learner, "/learn/notes", {
      courseId: publishedCourse.id,
      lessonId: firstLesson.id,
      activityId: nonQuizActivity.id,
      content: uniqueName("E2E private note"),
    });
    expect(note.id).toBeTruthy();

    const updatedNote = await apiPatch<any>(
      request,
      learner,
      `/learn/notes/${note.id}`,
      { content: `${note.content} updated` },
    );
    expect(updatedNote.content).toContain("updated");

    const bookmark = await apiPost<any>(request, learner, "/learn/bookmarks", {
      courseId: publishedCourse.id,
      lessonId: firstLesson.id,
      activityId: nonQuizActivity.id,
      title: uniqueName("E2E bookmark"),
      note: "Created by Playwright",
    });
    expect(bookmark.id).toBeTruthy();

    const context = await apiGet<any>(
      request,
      learner,
      `/learn/activities/${nonQuizActivity.id}/workspace-context`,
    );
    expect(context.activity.id).toBe(nonQuizActivity.id);
    expect(Array.isArray(context.availablePanels)).toBe(true);

    let transcript: any[] = [];
    for (const enrollmentItem of enrollments) {
      const enrolledCourse = await apiGet<any>(
        request,
        learner,
        `/learn/courses/${enrollmentItem.course.id}`,
      );
      const videoActivities = flattenActivities(enrolledCourse.curriculum).filter(
        (activity: any) => activity.activityTypeKey === "core.video",
      );
      for (const activity of videoActivities) {
        transcript = await apiGet<any[]>(
          request,
          learner,
          `/learn/activities/${activity.id}/transcript`,
        );
        if (transcript.length > 0) break;
      }
      if (transcript.length > 0) break;
    }
    expect(transcript.length).toBeGreaterThan(0);
    expect(transcript[0].startSeconds).toBeGreaterThanOrEqual(0);

    await apiDelete(request, learner, `/learn/bookmarks/${bookmark.id}`);
    await apiDelete(request, learner, `/learn/notes/${note.id}`);
  });
});
