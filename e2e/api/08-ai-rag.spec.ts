import { expect, test } from "@playwright/test";
import { apiGet, apiPost, apiUrl, login } from "../helpers/api";

test.describe("Phase 08 AI RAG", () => {
  test("default disabled mode is safe and usable without provider keys", async ({
    request,
  }) => {
    const learner = await login(request, "learner");
    const status = await apiGet<Record<string, unknown>>(
      request,
      learner,
      "/ai/status",
    );
    expect(status).toMatchObject({
      enabled: false,
      chatProvider: "mock",
      embeddingProvider: "mock",
    });
    expect(JSON.stringify(status)).not.toMatch(/api[_-]?key|ChangeMe123/i);

    const enrollments = await apiGet<any[]>(
      request,
      learner,
      "/my/enrollments",
    );
    const learning = await apiGet<any>(
      request,
      learner,
      `/learn/courses/${enrollments[0].courseId}`,
    );
    const lesson = learning.curriculum.modules[0].lessons[0];
    const activity = lesson.activities[0];
    const answer = await apiPost<any>(request, learner, "/learn/ai/tutor", {
      courseId: enrollments[0].courseId,
      lessonId: lesson.id,
      activityId: activity.id,
      question: "jelaskan materi ini",
    });
    expect(answer).toMatchObject({
      sourceType: "DISABLED",
      disabled: true,
      citations: [],
    });
    expect(answer.conversationId).toBeTruthy();
  });

  test("AI status requires authentication", async ({ request }) => {
    const response = await request.get(apiUrl("/ai/status"));
    expect(response.status()).toBe(401);
  });
});
