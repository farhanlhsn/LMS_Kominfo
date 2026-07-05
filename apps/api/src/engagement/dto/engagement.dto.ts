import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

export class DiscussionQueryDto {
  @IsString() courseId!: string;
  @IsOptional() @IsString() lessonId?: string;
  @IsOptional() @IsString() activityId?: string;
}

export class CreateThreadDto {
  @IsString() courseId!: string;
  @IsOptional() @IsString() lessonId?: string;
  @IsOptional() @IsString() activityId?: string;
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsString() @MinLength(1) @MaxLength(20_000) body!: string;
}

export class UpdateDiscussionDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20_000) body?: string;
}

export class CreateReplyDto {
  @IsOptional() @IsString() parentReplyId?: string;
  @IsString() @MinLength(1) @MaxLength(20_000) body!: string;
}

export class ModerateThreadDto {
  @IsOptional() @IsBoolean() pinned?: boolean;
  @IsOptional() @IsBoolean() locked?: boolean;
  @IsOptional() @IsIn(["VISIBLE", "HIDDEN"]) status?: "VISIBLE" | "HIDDEN";
}

export class ModerateReplyDto {
  @IsIn(["VISIBLE", "HIDDEN"]) status!: "VISIBLE" | "HIDDEN";
}

export class ReportDiscussionDto {
  @IsIn(["SPAM", "HARASSMENT", "INAPPROPRIATE", "MISINFORMATION", "OTHER"])
  reason!: string;
  @IsOptional() @IsString() @MaxLength(1000) details?: string;
}

export class ResolveDiscussionReportDto {
  @IsIn(["RESOLVED", "DISMISSED"]) status!: "RESOLVED" | "DISMISSED";
  @IsOptional() @IsBoolean() hideContent?: boolean;
}

export class LiveClassQueryDto {
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateLiveClassDto {
  @IsString() courseId!: string;
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(10_000) description?: string;
  @Transform(({ value }) => typeof value === "string" ? value.toUpperCase() : value)
  @IsIn(["MANUAL_LINK", "ZOOM", "GOOGLE_MEET", "CUSTOM"])
  provider!: "MANUAL_LINK" | "ZOOM" | "GOOGLE_MEET" | "CUSTOM";
  @IsOptional() @ValidateIf((_, value) => Boolean(value)) @IsUrl({ require_tld: false }) meetingUrl?: string;
  @IsDateString() startAt!: string;
  @IsDateString() endAt!: string;
  @IsString() @MaxLength(100) timezone!: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateLiveClassDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(10_000) description?: string;
  @IsOptional() @Transform(({ value }) => typeof value === "string" ? value.toUpperCase() : value)
  @IsIn(["MANUAL_LINK", "ZOOM", "GOOGLE_MEET", "CUSTOM"])
  provider?: "MANUAL_LINK" | "ZOOM" | "GOOGLE_MEET" | "CUSTOM";
  @IsOptional() @ValidateIf((_, value) => Boolean(value)) @IsUrl({ require_tld: false }) meetingUrl?: string;
  @IsOptional() @IsDateString() startAt?: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsString() @MaxLength(100) timezone?: string;
  @IsOptional() @IsIn(["SCHEDULED", "LIVE", "ENDED"])
  status?: "SCHEDULED" | "LIVE" | "ENDED";
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class NotificationQueryDto {
  @IsOptional() @Type(() => Boolean) @IsBoolean() unreadOnly?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional() @IsBoolean() inAppEnabled?: boolean;
  @IsOptional() @IsBoolean() emailEnabled?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) mutedTypes?: string[];
}

export class CalendarQueryDto {
  @IsDateString() from!: string;
  @IsDateString() to!: string;
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsString() type?: string;
}

export class CreateCalendarEventDto {
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsString() lessonId?: string;
  @IsOptional() @IsString() activityId?: string;
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsIn(["COURSE_EVENT", "COURSE_START", "COURSE_END", "ANNOUNCEMENT"])
  type!: string;
  @IsDateString() startsAt!: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsString() @MaxLength(100) timezone!: string;
  @IsOptional() @IsString() @MaxLength(500) actionUrl?: string;
  @IsOptional() @IsIn(["personal", "course"]) visibility?: "personal" | "course";
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateCalendarEventDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsIn(["COURSE_EVENT", "COURSE_START", "COURSE_END", "ANNOUNCEMENT"]) type?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() @MaxLength(100) timezone?: string;
  @IsOptional() @IsString() @MaxLength(500) actionUrl?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
