import type {
  AiQuestionScope,
  GenerateCourseAiQuestionsInput,
} from "./lms-types";

export interface AiQuestionScopeSelection {
  scope: AiQuestionScope;
  moduleId?: string;
  lessonId?: string;
  activityId?: string;
  sourceDocumentIds?: string[];
  questionCount: number;
  difficulty: GenerateCourseAiQuestionsInput["difficulty"];
  prompt?: string;
}

export function isAiQuestionScopeComplete(
  selection: AiQuestionScopeSelection,
) {
  if (selection.scope === "COURSE") return true;
  if (selection.scope === "MODULE") return Boolean(selection.moduleId);
  if (selection.scope === "LESSON") return Boolean(selection.lessonId);
  if (selection.scope === "ACTIVITY") return Boolean(selection.activityId);
  return Boolean(selection.sourceDocumentIds?.length);
}

export function buildAiQuestionGenerationInput(
  selection: AiQuestionScopeSelection,
): GenerateCourseAiQuestionsInput {
  return {
    scope: selection.scope,
    questionCount: selection.questionCount,
    difficulty: selection.difficulty,
    prompt: selection.prompt?.trim() || undefined,
    ...(selection.scope === "MODULE"
      ? { moduleId: selection.moduleId }
      : {}),
    ...(selection.scope === "LESSON"
      ? { lessonId: selection.lessonId }
      : {}),
    ...(selection.scope === "ACTIVITY"
      ? { activityId: selection.activityId }
      : {}),
    ...(selection.scope === "DOCUMENTS"
      ? { sourceDocumentIds: selection.sourceDocumentIds }
      : {}),
  };
}
