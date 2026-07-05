import { IsIn, IsObject, IsOptional, IsString, MinLength } from "class-validator";

export const MODERATION_TARGET_TYPES = [
  "CONTENT",
  "USER",
  "COMMENT",
  "COURSE",
  "DISCUSSION",
] as const;

export type ModerationTargetTypeValue = (typeof MODERATION_TARGET_TYPES)[number];

export const MODERATION_REPORT_STATUSES = [
  "OPEN",
  "IN_REVIEW",
  "RESOLVED",
  "DISMISSED",
] as const;

export type ModerationReportStatusValue =
  (typeof MODERATION_REPORT_STATUSES)[number];

export const MODERATION_ACTION_TYPES = [
  "WARN",
  "SUSPEND",
  "BAN",
  "REMOVE",
  "RESTORE",
  "LOCK",
] as const;

export type ModerationActionTypeValue =
  (typeof MODERATION_ACTION_TYPES)[number];

// ---------- Report DTOs ----------

export class CreateReportDto {
  @IsIn(MODERATION_TARGET_TYPES)
  targetType!: ModerationTargetTypeValue;

  @IsString()
  @MinLength(1)
  targetId!: string;

  @IsString()
  @MinLength(1)
  reason!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateReportDto {
  @IsOptional()
  @IsIn(MODERATION_REPORT_STATUSES)
  status?: ModerationReportStatusValue;

  @IsOptional()
  @IsString()
  resolution?: string;
}

export class ListReportsQueryDto {
  @IsOptional()
  @IsIn(MODERATION_TARGET_TYPES)
  targetType?: ModerationTargetTypeValue;

  @IsOptional()
  @IsIn(MODERATION_REPORT_STATUSES)
  status?: ModerationReportStatusValue;
}

// ---------- Action DTOs ----------

export class CreateActionDto {
  @IsIn(MODERATION_TARGET_TYPES)
  targetType!: ModerationTargetTypeValue;

  @IsString()
  @MinLength(1)
  targetId!: string;

  @IsIn(MODERATION_ACTION_TYPES)
  actionType!: ModerationActionTypeValue;

  @IsString()
  @MinLength(1)
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
