import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min, IsIn, IsBoolean } from 'class-validator';

export class CreateLessonDto {
  @IsString() @MinLength(2) @MaxLength(200)
  title!: string;

  @IsOptional() @IsInt() @Min(0)
  order?: number;

  @IsOptional() @IsIn(['TEXT', 'VIDEO', 'PDF', 'LINK', 'QUIZ', 'ASSIGNMENT'])
  type?: string;

  @IsOptional() @IsInt() @Min(0)
  duration?: number;

  @IsOptional() @IsBoolean()
  isPreview?: boolean;

  // Content fields (optional, depends on type)
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
