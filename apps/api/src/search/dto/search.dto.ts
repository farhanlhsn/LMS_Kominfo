import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export const SEARCH_ENTITY_TYPES = [
  "course",
  "lesson",
  "discussion",
  "user",
  "certificate",
  "help_article",
] as const;

export class GlobalSearchQueryDto {
  @IsString()
  @MinLength(1)
  q!: string;

  @IsOptional()
  @IsArray()
  @IsIn(SEARCH_ENTITY_TYPES, { each: true })
  @Type(() => String)
  types?: string[];

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class SearchAnalyticsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  days?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
