import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export const COHORT_STATUSES = [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

export type CohortStatus = (typeof COHORT_STATUSES)[number];

export class CreateCohortDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  courseId!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxSeats?: number;

  @IsOptional()
  @IsIn([...COHORT_STATUSES])
  status?: CohortStatus;
}

export class UpdateCohortDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxSeats?: number;

  @IsOptional()
  @IsIn([...COHORT_STATUSES])
  status?: CohortStatus;
}

export class AddCohortMemberDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsIn(["ACTIVE", "WITHDRAWN", "COMPLETED"])
  status?: "ACTIVE" | "WITHDRAWN" | "COMPLETED";
}

export class CreateCohortScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsString()
  @MinLength(1)
  startTime!: string;

  @IsString()
  @MinLength(1)
  endTime!: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  meetingUrl?: string;
}

export class UpdateUserTimezoneDto {
  @IsString()
  @MinLength(1)
  timezone!: string;

  @IsOptional()
  @IsBoolean()
  autoDetect?: boolean;
}

export class BatchCreateCohortScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCohortScheduleDto)
  items!: CreateCohortScheduleDto[];
}
