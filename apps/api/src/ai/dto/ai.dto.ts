import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class AskAiTutorDto {
  @IsString()
  courseId!: string;

  @IsString()
  lessonId!: string;

  @IsString()
  activityId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  question!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  selectedText?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  includeNoteIds?: string[];
}
