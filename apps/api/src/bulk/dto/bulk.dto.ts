import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export const BULK_JOB_TYPES = [
  "IMPORT",
  "EXPORT",
  "ARCHIVE",
  "UNARCHIVE",
  "ENROLL",
  "UNENROLL",
  "TAG",
  "UNTAG",
] as const;

export type BulkJobTypeValue = (typeof BULK_JOB_TYPES)[number];

export const BULK_ENTITY_TYPES = [
  "course",
  "user",
  "enrollment",
  "content",
  "tag",
] as const;

export type BulkEntityTypeValue = (typeof BULK_ENTITY_TYPES)[number];

export class BulkJobItemInput {
  @IsIn(BULK_ENTITY_TYPES)
  entityType!: BulkEntityTypeValue;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  entityId?: string;

  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}

export class CreateBulkJobDto {
  @IsIn(BULK_JOB_TYPES)
  type!: BulkJobTypeValue;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => BulkJobItemInput)
  items!: BulkJobItemInput[];
}

export class ListBulkJobsQueryDto {
  @IsOptional()
  @IsIn(BULK_JOB_TYPES)
  type?: BulkJobTypeValue;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CancelBulkJobDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
