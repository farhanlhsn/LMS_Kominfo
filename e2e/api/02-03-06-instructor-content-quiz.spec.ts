import { expect, test } from "@playwright/test";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiUrl,
  authHeaders,
  login,
  uniqueName,
  unwrap,
} from "../helpers/api";

test.describe("Phase 02, 03, and 06 instructor authoring, content, and quiz flow", () => {
  test.afterEach(async ({ request }) => {
    const instructor = await login(request, "instructor");
    const courses = await apiGet<any[]>(request, instructor, "/instructor/courses");
    await Promise.all(
      courses
        .filter((course) => String(course.title).startsWith("E2E Course "))
        .map((course) =>
          apiDelete(request, instructor, `/instructor/courses/${course.id}`).catch(
            () => undefined,
          ),
        ),
    );
  });

  test("instructor can author a publishable API-backed course with content and quiz, learner can complete quiz", async ({
    request,
  }) => {
    const instructor = await login(request, "instructor");
    const learner = await login(request, "learner");
    const title = uniqueName("E2E Course");

    const course = await apiPost<any>(request, instructor, "/instructor/courses", {
      title,
      subtitle: "Playwright generated course",
      description: "Covers end-to-end course builder, content, and quiz flow.",
      level: "BEGINNER",
      visibility: "ORGANIZATION_ONLY",
    });
    expect(course.title).toBe(title);

    const module = await apiPost<any>(
      request,
      instructor,
      `/instructor/courses/${course.id}/modules`,
      {
        title: "E2E Module",
        description: "Created by Playwright",
      },
    );
    await apiPatch(request, instructor, `/instructor/modules/${module.id}`, {
      isPublished: true,
    });

    const lesson = await apiPost<any>(
      request,
      instructor,
      `/instructor/modules/${module.id}/lessons`,
      {
        title: "E2E Lesson",
        summary: "Created by Playwright",
        estimatedMinutes: 12,
      },
    );
    await apiPatch(request, instructor, `/instructor/lessons/${lesson.id}`, {
      isPublished: true,
      isPreview: true,
    });

    const textActivity = await apiPost<any>(
      request,
      instructor,
      `/instructor/lessons/${lesson.id}/activities`,
      {
        title: "E2E Rich Text",
        activityTypeKey: "core.text",
        description: "Rich text content activity",
        isRequired: true,
      },
    );
    await apiPatch(request, instructor, `/instructor/activities/${textActivity.id}`, {
      isPublished: true,
    });
    await apiPatch(
      request,
      instructor,
      `/instructor/activities/${textActivity.id}/content`,
      {
        textContent: "This rich text material was saved by an E2E test.",
        content: {
          format: "plain_text",
          body: "This rich text material was saved by an E2E test.",
        },
      },
    );

    const videoActivity = await apiPost<any>(
      request,
      instructor,
      `/instructor/lessons/${lesson.id}/activities`,
      {
        title: "E2E Video",
        activityTypeKey: "core.video",
        description: "External video URL activity",
        isRequired: false,
      },
    );
    await apiPatch(request, instructor, `/instructor/activities/${videoActivity.id}`, {
      isPublished: true,
    });
    await apiPatch(
      request,
      instructor,
      `/instructor/activities/${videoActivity.id}/content`,
      {
        textContent: "External video content",
        externalUrl:
          "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        content: {
          provider: "external-url",
          videoUrl:
            "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        },
      },
    );

    const linkActivity = await apiPost<any>(
      request,
      instructor,
      `/instructor/lessons/${lesson.id}/activities`,
      {
        title: "E2E Link",
        activityTypeKey: "core.link",
        isRequired: false,
      },
    );
    await apiPatch(request, instructor, `/instructor/activities/${linkActivity.id}`, {
      isPublished: true,
    });
    await apiPatch(
      request,
      instructor,
      `/instructor/activities/${linkActivity.id}/content`,
      {
        externalUrl: "https://example.com/e2e-resource",
        textContent: "External link content",
        content: {
          url: "https://example.com/e2e-resource",
        },
      },
    );

    const uploadResponse = await request.post(apiUrl("/files/upload"), {
      headers: authHeaders(instructor),
      multipart: {
        file: {
          name: "e2e-worksheet.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("E2E worksheet content"),
        },
        purpose: "CONTENT",
        visibility: "ORGANIZATION",
        accessLevel: "ORGANIZATION_MEMBERS",
      },
    });
    const file = await unwrap<any>(uploadResponse);
    expect(file.id).toBeTruthy();
    const signedUrl = await apiPost<any>(
      request,
      instructor,
      `/files/${file.id}/signed-url`,
      { expiresInSeconds: 300 },
    );
    expect(signedUrl.url).toContain(file.key);

    const fileActivity = await apiPost<any>(
      request,
      instructor,
      `/instructor/lessons/${lesson.id}/activities`,
      {
        title: "E2E File",
        activityTypeKey: "core.file",
        isRequired: false,
      },
    );
    await apiPatch(request, instructor, `/instructor/activities/${fileActivity.id}`, {
      isPublished: true,
    });
    await apiPost(
      request,
      instructor,
      `/instructor/activities/${fileActivity.id}/attach-file`,
      { fileId: file.id },
    );

    const libraryItem = await apiPost<any>(request, instructor, "/content-library", {
      title: uniqueName("E2E Library Item"),
      description: "Created by Playwright",
      type: "RICH_TEXT",
      tags: ["e2e"],
      metadata: {
        textContent: "Reusable library item from E2E.",
      },
    });
    await apiPost(
      request,
      instructor,
      `/instructor/activities/${textActivity.id}/attach-library-item`,
      { libraryItemId: libraryItem.id },
    );

    const bank = await apiPost<any>(request, instructor, "/instructor/question-banks", {
      title: uniqueName("E2E Question Bank"),
      description: "Generated by E2E",
    });
    const question = await apiPost<any>(request, instructor, "/instructor/questions", {
      questionBankId: bank.id,
      type: "MULTIPLE_CHOICE",
      prompt: "Which answer is correct for this E2E quiz?",
      points: 1,
      options: [
        { text: "Correct", isCorrect: true },
        { text: "Incorrect", isCorrect: false },
      ],
    });
    const quiz = await apiPost<any>(request, instructor, "/instructor/quizzes", {
      title: uniqueName("E2E Quiz"),
      description: "Auto-graded E2E quiz",
      passingScorePercent: 100,
      attemptLimit: 2,
      showCorrectAnswers: true,
      showFeedback: true,
    });
    await apiPost(request, instructor, `/instructor/quizzes/${quiz.id}/questions`, {
      questionId: question.id,
      points: 1,
    });
    const publishedQuiz = await apiPost<any>(
      request,
      instructor,
      `/instructor/quizzes/${quiz.id}/publish`,
    );
    expect(publishedQuiz.status).toBe("PUBLISHED");

    const quizActivity = await apiPost<any>(
      request,
      instructor,
      `/instructor/lessons/${lesson.id}/activities`,
      {
        title: "E2E Quiz Activity",
        activityTypeKey: "core.quiz",
        isRequired: true,
      },
    );
    await apiPatch(request, instructor, `/instructor/activities/${quizActivity.id}`, {
      isPublished: true,
    });
    await apiPost(
      request,
      instructor,
      `/instructor/activities/${quizActivity.id}/quiz`,
      { quizId: quiz.id },
    );

    await apiPost(request, instructor, `/instructor/courses/${course.id}/publish`);

    const publishedCourse = await apiGet<any>(
      request,
      learner,
      `/courses/${course.id}`,
    );
    expect(publishedCourse.status).toBe("PUBLISHED");

    await apiPost(request, learner, `/courses/${course.id}/enroll`);
    const learnerQuiz = await apiGet<any>(
      request,
      learner,
      `/learn/activities/${quizActivity.id}/quiz`,
    );
    expect(learnerQuiz.quiz.id).toBe(quiz.id);
    expect(learnerQuiz.quiz.questions).toHaveLength(1);

    const attempt = await apiPost<any>(
      request,
      learner,
      `/learn/activities/${quizActivity.id}/quiz/attempts`,
    );
    const correctOption = learnerQuiz.quiz.questions[0].options.find(
      (option: any) => option.text === "Correct",
    );
    expect(correctOption.id).toBeTruthy();

    await apiPatch(request, learner, `/learn/quiz-attempts/${attempt.id}/answers`, {
      questionId: learnerQuiz.quiz.questions[0].id,
      selectedOptionIds: [correctOption.id],
    });
    const result = await apiPost<any>(
      request,
      learner,
      `/learn/quiz-attempts/${attempt.id}/submit`,
    );

    expect(result.attempt.passed).toBe(true);
    expect(result.attempt.percentage).toBe(100);

    const progress = await apiPost<any>(
      request,
      learner,
      `/learn/activities/${quizActivity.id}/complete`,
    );
    expect(progress.activityProgress.status).toBe("COMPLETED");
  });
});
