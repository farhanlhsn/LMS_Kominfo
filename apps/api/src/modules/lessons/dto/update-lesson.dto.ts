import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

export class UpdateLessonDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200)
  title?: string;

  @IsOptional() @IsInt() @Min(0)
  order?: number;

  @IsOptional() @IsInt() @Min(0)
  duration?: number;

  @IsOptional() @IsBoolean()
  isPreview?: boolean;

  @IsOptional() @IsBoolean()
  isPublished?: boolean;

  @IsOptional() @IsString()
  markdown?: string;

  @IsOptional() @IsString()
  videoUrl?: string;

  @IsOptional() @IsString()
  youtubeUrl?: string;

  @IsOptional() @IsString()
  pdfUrl?: string;

  @IsOptional() @IsString()
  externalUrl?: string;
}
