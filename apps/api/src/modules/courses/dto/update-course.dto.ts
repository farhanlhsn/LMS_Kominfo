import { IsString, MinLength, MaxLength, IsOptional, IsIn, IsUUID, IsInt, Min, IsArray } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200)
  title?: string;

  @IsOptional() @IsString() @MaxLength(500)
  shortDescription?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  thumbnailUrl?: string;

  @IsOptional() @IsIn(['beginner', 'intermediate', 'advanced'])
  difficulty?: string;

  @IsOptional() @IsInt() @Min(0)
  estimatedDuration?: number;

  @IsOptional() @IsString()
  language?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];
}
