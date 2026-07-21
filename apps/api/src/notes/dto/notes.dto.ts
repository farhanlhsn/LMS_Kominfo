import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export const TRANSCRIPT_NOTE_COLORS = [
  "yellow",
  "green",
  "blue",
  "pink",
  "purple",
] as const;

export class CreateTranscriptNoteDto {
  @IsString()
  lessonId!: string;

  @IsOptional()
  @IsString()
  activityId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timestampSeconds?: number;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsIn(TRANSCRIPT_NOTE_COLORS as unknown as string[])
  color?: "yellow" | "green" | "blue" | "pink" | "purple";

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateTranscriptNoteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsIn(TRANSCRIPT_NOTE_COLORS as unknown as string[])
  color?: "yellow" | "green" | "blue" | "pink" | "purple";

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  timestampSeconds?: number;
}

export class SearchTranscriptNotesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  activityId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class GenerateNoteContextDto {
  @IsOptional()
  @IsString()
  providerKey?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  candidateNoteIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  metadata?: Record<string, unknown>;
}
