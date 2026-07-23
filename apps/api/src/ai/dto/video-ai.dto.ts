import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export const AI_QUESTION_SCOPES = [
  "COURSE",
  "MODULE",
  "LESSON",
  "ACTIVITY",
  "DOCUMENTS",
] as const;

export type AiQuestionScope = (typeof AI_QUESTION_SCOPES)[number];

export const AI_QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "MULTIPLE_ANSWER",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "ESSAY",
  "NUMERIC",
] as const;

export type AiQuestionType = (typeof AI_QUESTION_TYPES)[number];

export class GenerateVideoSummaryDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  prompt?: string;
}

export class GenerateVideoQuizDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  questionCount?: number;

  @IsOptional()
  @IsIn(["easy", "medium", "hard"])
  difficulty?: "easy" | "medium" | "hard";

  @IsOptional()
  @IsString()
  prompt?: string;
}

export class GenerateCourseQuestionsDto {
  @IsOptional()
  @IsIn(AI_QUESTION_SCOPES)
  scope?: AiQuestionScope;

  @IsOptional()
  @IsString()
  moduleId?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  activityId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  sourceDocumentIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  questionCount?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsIn(AI_QUESTION_TYPES, { each: true })
  questionTypes?: AiQuestionType[];

  @IsOptional()
  @IsIn(["easy", "medium", "hard"])
  difficulty?: "easy" | "medium" | "hard";

  @IsOptional()
  @IsString()
  prompt?: string;
}

export class ListAiGeneratedItemsQueryDto {
  @IsOptional()
  @IsIn([
    "SUMMARY",
    "QUIZ",
    "QUESTION",
    "FLASHCARD",
    "ASSIGNMENT",
    "RUBRIC",
    "COURSE_OUTLINE",
    "LESSON_CONTENT",
  ])
  type?: string;

  @IsOptional()
  @IsIn(["DRAFT", "APPROVED", "REJECTED", "PUBLISHED"])
  status?: string;

  @IsOptional()
  @IsString()
  activityId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;
}

export class UpdateAiGeneratedItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsObject()
  output?: Record<string, unknown>;
}
