import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

// ── SCORM ───────────────────────────────────────────
export class CreateScormPackageDto {
  @IsString() courseId!: string;
  @IsOptional() @IsString() activityId?: string;
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsOptional() @IsIn(["1.2", "2004"]) version?: "1.2" | "2004";
  @IsOptional() @IsString() @MaxLength(2000) entryUrl?: string;
  @IsOptional() @IsString() fileId?: string;
  @IsOptional() @IsObject() manifest?: Record<string, unknown>;
}

export class UpdateScormPackageDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) title?: string;
  @IsOptional() @IsIn(["DRAFT", "PUBLISHED", "ARCHIVED"]) status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  @IsOptional() @IsString() @MaxLength(2000) entryUrl?: string;
  @IsOptional() @IsObject() manifest?: Record<string, unknown>;
}

export class StartScormAttemptDto {
  @IsOptional() @IsString() sessionId?: string;
}

export class CommitScormAttemptDto {
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsIn(["NOT_STARTED", "IN_PROGRESS", "SUSPENDED", "COMPLETED"]) status?: string;
  @IsOptional() @IsIn(["INCOMPLETE", "COMPLETED", "NOT_ATTEMPTED", "UNKNOWN"]) completion?: string;
  @IsOptional() @IsIn(["PASSED", "FAILED", "UNKNOWN"]) success?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) scoreRaw?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) scoreMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) scoreMax?: number;
  @IsOptional() @IsObject() cmiData?: Record<string, unknown>;
  @IsOptional() @IsBoolean() finalize?: boolean;
}

// ── H5P ─────────────────────────────────────────────
export class CreateH5PContentDto {
  @IsString() courseId!: string;
  @IsOptional() @IsString() activityId?: string;
  @IsString() @MinLength(2) @MaxLength(100) library!: string;
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsOptional() @IsObject() params?: Record<string, unknown>;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @IsOptional() @IsString() fileId?: string;
}

export class UpdateH5PContentDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) title?: string;
  @IsOptional() @IsObject() params?: Record<string, unknown>;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @IsOptional() @IsIn(["DRAFT", "PUBLISHED", "ARCHIVED"]) status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export class SubmitH5PResultDto {
  @IsOptional() @Type(() => Number) score?: number;
  @IsOptional() @Type(() => Number) maxScore?: number;
  @IsOptional() @IsIn(["INCOMPLETE", "COMPLETED"]) completion?: string;
  @IsOptional() @IsIn(["PASSED", "FAILED", "UNKNOWN"]) success?: string;
  @IsOptional() @IsObject() raw?: Record<string, unknown>;
}

// ── xAPI ────────────────────────────────────────────
export class PostXapiStatementsDto {
  @IsArray() statements!: Array<Record<string, unknown>>;
}

export class XapiStateQueryDto {
  @IsString() activityId!: string;
  @IsString() stateId!: string;
  @IsOptional() @IsString() agent?: string;
}

export class PutXapiStateDto {
  @IsString() activityId!: string;
  @IsString() stateId!: string;
  @IsObject() agent!: Record<string, unknown>;
  @IsObject() state!: Record<string, unknown>;
}

// ── Survey ──────────────────────────────────────────
export class CreateSurveyDto {
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsString() activityId?: string;
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsBoolean() anonymous?: boolean;
  @IsOptional() @IsBoolean() allowMultipleSubmissions?: boolean;
  @IsOptional() @IsDateString() closesAt?: string;
  @IsOptional() @IsArray() questions?: Array<Partial<CreateSurveyQuestionDto>>;
}

export class UpdateSurveyDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsIn(["DRAFT", "PUBLISHED", "CLOSED"]) status?: "DRAFT" | "PUBLISHED" | "CLOSED";
  @IsOptional() @IsBoolean() anonymous?: boolean;
  @IsOptional() @IsBoolean() allowMultipleSubmissions?: boolean;
  @IsOptional() @IsDateString() closesAt?: string;
}

export class CreateSurveyQuestionDto {
  @IsIn(["SHORT_TEXT", "LONG_TEXT", "SINGLE_CHOICE", "MULTI_CHOICE", "RATING", "SCALE", "YES_NO"])
  type!: "SHORT_TEXT" | "LONG_TEXT" | "SINGLE_CHOICE" | "MULTI_CHOICE" | "RATING" | "SCALE" | "YES_NO";
  @IsString() @MinLength(1) @MaxLength(500) prompt!: string;
  @IsOptional() @IsString() @MaxLength(1000) helpText?: string;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) orderIndex?: number;
  @IsOptional() @IsArray() options?: Array<{ id: string; label: string; value?: string }>;
  @IsOptional() @IsObject() scale?: { min: number; max: number; minLabel?: string; maxLabel?: string };
}

export class SubmitSurveyResponseDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => SurveyAnswerInputDto)
  answers!: SurveyAnswerInputDto[];
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class SurveyAnswerInputDto {
  @IsString() questionId!: string;
  value!: unknown;
  @IsOptional() @IsString() textValue?: string;
}

export class SurveyQueryDto {
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsString() activityId?: string;
  @IsOptional() @IsIn(["DRAFT", "PUBLISHED", "CLOSED"]) status?: "DRAFT" | "PUBLISHED" | "CLOSED";
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

// ── Poll ────────────────────────────────────────────
export class CreatePollDto {
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsString() activityId?: string;
  @IsString() @MinLength(3) @MaxLength(500) question!: string;
  @IsArray() @ArrayMinSize(2) options!: Array<{ id: string; label: string }>;
  @IsOptional() @IsBoolean() allowMultiple?: boolean;
  @IsOptional() @IsBoolean() anonymous?: boolean;
  @IsOptional() @IsDateString() closesAt?: string;
}

export class UpdatePollDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(500) question?: string;
  @IsOptional() @IsArray() options?: Array<{ id: string; label: string }>;
  @IsOptional() @IsBoolean() allowMultiple?: boolean;
  @IsOptional() @IsIn(["DRAFT", "ACTIVE", "CLOSED"]) status?: "DRAFT" | "ACTIVE" | "CLOSED";
  @IsOptional() @IsDateString() closesAt?: string;
}

export class VotePollDto {
  @IsArray() selected!: string[];
}

export class PollQueryDto {
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsString() activityId?: string;
  @IsOptional() @IsIn(["DRAFT", "ACTIVE", "CLOSED"]) status?: "DRAFT" | "ACTIVE" | "CLOSED";
}

// ── Course Feedback ─────────────────────────────────
export class SubmitCourseFeedbackDto {
  @IsString() courseId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class CourseFeedbackQueryDto {
  @IsString() courseId!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
