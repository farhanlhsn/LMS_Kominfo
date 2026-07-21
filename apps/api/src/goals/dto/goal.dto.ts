import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export type LearningGoalTargetType =
  | "COURSE_COMPLETION"
  | "ACTIVITY_COMPLETION"
  | "STUDY_TIME"
  | "SCORE"
  | "CUSTOM";

export class CreateLearningGoalDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsIn([
    "COURSE_COMPLETION",
    "ACTIVITY_COMPLETION",
    "STUDY_TIME",
    "SCORE",
    "CUSTOM",
  ])
  targetType!: LearningGoalTargetType;

  @IsOptional()
  targetValue?: Record<string, unknown>;

  @IsOptional()
  progressValue?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  dueAt?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateLearningGoalDto extends CreateLearningGoalDto {
  @IsOptional()
  @IsIn(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"])
  status?: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
}
