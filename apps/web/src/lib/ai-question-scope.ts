import type {
  AiQuestionScope,
  GenerateCourseAiQuestionsInput,
  QuestionType,
} from "./lms-types";

export interface AiQuestionScopeSelection {
  scope: AiQuestionScope;
  moduleId?: string;
  lessonId?: string;
  activityId?: string;
  sourceDocumentIds?: string[];
  questionCount: number;
  questionTypes?: QuestionType[];
  difficulty: GenerateCourseAiQuestionsInput["difficulty"];
  prompt?: string;
}

export function isAiQuestionScopeComplete(selection: AiQuestionScopeSelection) {
  if (selection.questionTypes && selection.questionTypes.length === 0) {
    return false;
  }
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
    questionTypes: selection.questionTypes,
    difficulty: selection.difficulty,
    prompt: selection.prompt?.trim() || undefined,
    ...(selection.scope === "MODULE" ? { moduleId: selection.moduleId } : {}),
    ...(selection.scope === "LESSON" ? { lessonId: selection.lessonId } : {}),
    ...(selection.scope === "ACTIVITY"
      ? { activityId: selection.activityId }
      : {}),
    ...(selection.scope === "DOCUMENTS"
      ? { sourceDocumentIds: selection.sourceDocumentIds }
      : {}),
  };
}
