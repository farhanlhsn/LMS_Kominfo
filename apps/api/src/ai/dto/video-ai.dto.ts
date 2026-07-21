import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min } from "class-validator";

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

export class ListAiGeneratedItemsQueryDto {
  @IsOptional()
  @IsIn(["SUMMARY", "QUIZ", "QUESTION", "FLASHCARD", "ASSIGNMENT", "RUBRIC", "COURSE_OUTLINE", "LESSON_CONTENT"])
  type?: string;

  @IsOptional()
  @IsIn(["DRAFT", "APPROVED", "REJECTED", "PUBLISHED"])
  status?: string;

  @IsOptional()
  @IsString()
  activityId?: string;
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
