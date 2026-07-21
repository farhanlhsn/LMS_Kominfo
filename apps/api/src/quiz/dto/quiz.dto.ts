import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateQuestionBankDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateQuestionBankDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class QuestionOptionDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class CreateQuestionDto {
  @IsString()
  questionBankId!: string;

  @IsIn([
    "MULTIPLE_CHOICE",
    "MULTIPLE_ANSWER",
    "TRUE_FALSE",
    "SHORT_ANSWER",
    "ESSAY",
    "NUMERIC",
  ])
  type!:
    | "MULTIPLE_CHOICE"
    | "MULTIPLE_ANSWER"
    | "TRUE_FALSE"
    | "SHORT_ANSWER"
    | "ESSAY"
    | "NUMERIC";

  @IsString()
  @MinLength(2)
  prompt!: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsArray()
  acceptedAnswers?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  numericTolerance?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  questionBankId?: string;

  @IsOptional()
  @IsIn([
    "MULTIPLE_CHOICE",
    "MULTIPLE_ANSWER",
    "TRUE_FALSE",
    "SHORT_ANSWER",
    "ESSAY",
    "NUMERIC",
  ])
  type?: CreateQuestionDto["type"];

  @IsOptional()
  @IsString()
  @MinLength(2)
  prompt?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsArray()
  acceptedAnswers?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  numericTolerance?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class CreateQuizDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  activityId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  passingScorePercent?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  attemptLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  showCorrectAnswers?: boolean;

  @IsOptional()
  @IsBoolean()
  showFeedback?: boolean;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateQuizDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  activityId?: string;

  @IsOptional()
  @IsIn(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";

  @IsOptional()
  @IsNumber()
  @Min(0)
  passingScorePercent?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  attemptLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  showCorrectAnswers?: boolean;

  @IsOptional()
  @IsBoolean()
  showFeedback?: boolean;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class AddQuizQuestionDto {
  @IsString()
  questionId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

export class ReorderQuizQuestionsDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export class AttachQuizDto {
  @IsString()
  quizId!: string;
}

export class SaveQuizAnswerDto {
  @IsString()
  questionId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedOptionIds?: string[];

  @IsOptional()
  @IsString()
  textAnswer?: string;

  @IsOptional()
  @IsNumber()
  numericAnswer?: number;
}

export class ManualGradeAnswerDto {
  @IsNumber()
  @Min(0)
  pointsAwarded!: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
