import { expect, test } from "@playwright/test";
import { apiGet, apiPatch, apiPost, login } from "../helpers/api";

function flattenActivities(course: any) {
  return (course.modules ?? []).flatMap((module: any) =>
    (module.lessons ?? []).flatMap((lesson: any) => lesson.activities ?? []),
  );
}

test.describe("Phase 06 seeded quiz attempt and manual grading foundation", () => {
  test("learner can submit essay answer and instructor can manually grade it", async ({
    request,
  }) => {
    const learner = await login(request, "learner");
    const instructor = await login(request, "instructor");

    const enrollments = await apiGet<any[]>(request, learner, "/my/enrollments");
    expect(enrollments.length).toBeGreaterThan(0);
    const seededEnrollment =
      enrollments.find(
        (enrollment) => enrollment.course.slug === "foundations-modern-web-apps",
      ) ?? enrollments[0];

    const learningCourse = await apiGet<any>(
      request,
      learner,
      `/learn/courses/${seededEnrollment.course.id}`,
    );
    const quizActivity = flattenActivities(learningCourse.curriculum).find(
      (activity: any) => activity.activityTypeKey === "core.quiz",
    );
    expect(quizActivity).toBeTruthy();

    const learnerQuiz = await apiGet<any>(
      request,
      learner,
      `/learn/activities/${quizActivity.id}/quiz`,
    );
    const essayQuestion = learnerQuiz.quiz.questions.find(
      (question: any) => question.type === "ESSAY",
    );
    expect(essayQuestion).toBeTruthy();

    const attempt = await apiPost<any>(
      request,
      learner,
      `/learn/activities/${quizActivity.id}/quiz/attempts`,
    );
    await apiPatch(request, learner, `/learn/quiz-attempts/${attempt.id}/answers`, {
      questionId: essayQuestion.id,
      textAnswer: "Tenant isolation keeps one organization's learning data private.",
    });
    const result = await apiPost<any>(
      request,
      learner,
      `/learn/quiz-attempts/${attempt.id}/submit`,
    );
    expect(["NEEDS_MANUAL_GRADING", "SUBMITTED"]).toContain(result.attempt.status);

    const attempts = await apiGet<any[]>(
      request,
      instructor,
      `/instructor/quizzes/${learnerQuiz.quiz.id}/attempts`,
    );
    expect(attempts.some((item) => item.id === attempt.id)).toBe(true);

    const detail = await apiGet<any>(
      request,
      instructor,
      `/instructor/quiz-attempts/${attempt.id}`,
    );
    const essayAnswer = detail.answers.find(
      (answer: any) => answer.question.id === essayQuestion.id,
    );
    expect(essayAnswer).toBeTruthy();

    const graded = await apiPatch<any>(
      request,
      instructor,
      `/instructor/quiz-answers/${essayAnswer.id}/grade`,
      {
        pointsAwarded: essayAnswer.maxPoints,
        feedback: "Good explanation.",
      },
    );
    expect(graded.status).toBe("CORRECT");
  });
});
