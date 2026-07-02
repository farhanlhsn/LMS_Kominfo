import { IsString, MinLength, MaxLength, IsOptional, IsIn, IsUUID, IsInt, Min, IsArray } from 'class-validator';

export class CreateCourseDto {
  @IsString() @MinLength(3) @MaxLength(200)
  title!: string;

  @IsString() @MinLength(3) @MaxLength(200)
  slug!: string;

  @IsString() @MaxLength(500)
  shortDescription!: string;

  @IsString()
  description!: string;

  @IsOptional() @IsString()
  thumbnailUrl?: string;

  @IsUUID()
  regionId!: string;

  @IsOptional() @IsIn(['beginner', 'intermediate', 'advanced'])
  difficulty?: string;

  @IsOptional() @IsInt() @Min(0)
  estimatedDuration?: number;

  @IsOptional() @IsString()
  language?: string;

  @IsString()
  category!: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];
}
