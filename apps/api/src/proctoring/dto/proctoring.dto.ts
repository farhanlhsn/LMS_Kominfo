import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  PROCTORING_EVENT_TYPES,
  PROCTORING_FLAG_STATUSES,
  PROCTORING_SEVERITIES,
  ProctoringEventType,
  ProctoringFlagStatus,
  ProctoringSeverity,
} from "../proctoring.provider";

export class IngestProctoringEventDto {
  @IsIn([...PROCTORING_EVENT_TYPES])
  type!: ProctoringEventType;

  @IsOptional()
  @IsIn([...PROCTORING_SEVERITIES])
  severity?: ProctoringSeverity;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ReviewProctoringFlagDto {
  @IsIn([...PROCTORING_FLAG_STATUSES])
  status!: ProctoringFlagStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BatchIngestProctoringEventsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestProctoringEventDto)
  events!: IngestProctoringEventDto[];
}
