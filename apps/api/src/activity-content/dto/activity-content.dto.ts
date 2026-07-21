import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class UpdateActivityContentDto {
  @IsOptional()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsString()
  externalUrl?: string;

  @IsOptional()
  @IsString()
  fileId?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class AttachFileDto {
  @IsString()
  fileId!: string;
}

export class AttachLibraryItemDto {
  @IsString()
  libraryItemId!: string;
}

export class VideoProgressDto {
  @IsNumber()
  @Min(0)
  currentTimeSeconds!: number;

  @IsNumber()
  @Min(0)
  durationSeconds!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  watchedPercent?: number;
}

export class ReprocessContentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  reason?: string;
}
