import { describe, expect, it } from "vitest";
import {
  buildAiQuestionGenerationInput,
  isAiQuestionScopeComplete,
} from "./ai-question-scope";

describe("AI question scope", () => {
  it.each([
    ["COURSE", {}, true],
    ["MODULE", { moduleId: "module-1" }, true],
    ["LESSON", { lessonId: "lesson-1" }, true],
    ["ACTIVITY", { activityId: "activity-1" }, true],
    ["DOCUMENTS", { sourceDocumentIds: ["document-1"] }, true],
    ["DOCUMENTS", { sourceDocumentIds: [] }, false],
  ] as const)("validates %s scope", (scope, values, expected) => {
    expect(
      isAiQuestionScopeComplete({
        scope,
        questionCount: 5,
        questionTypes: ["MULTIPLE_CHOICE"],
        difficulty: "medium",
        ...values,
      }),
    ).toBe(expected);
  });

  it("sends only identifier used by selected scope", () => {
    expect(
      buildAiQuestionGenerationInput({
        scope: "ACTIVITY",
        moduleId: "ignored-module",
        lessonId: "ignored-lesson",
        activityId: "activity-1",
        sourceDocumentIds: ["ignored-document"],
        questionCount: 7,
        questionTypes: ["MULTIPLE_CHOICE", "ESSAY"],
        difficulty: "hard",
        prompt: "  Focus on practice.  ",
      }),
    ).toEqual({
      scope: "ACTIVITY",
      activityId: "activity-1",
      questionCount: 7,
      questionTypes: ["MULTIPLE_CHOICE", "ESSAY"],
      difficulty: "hard",
      prompt: "Focus on practice.",
    });
  });

  it("requires a question type when the field is supplied", () => {
    expect(
      isAiQuestionScopeComplete({
        scope: "COURSE",
        questionCount: 5,
        questionTypes: [],
        difficulty: "medium",
      }),
    ).toBe(false);
  });
});
