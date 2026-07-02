import { IsString, MinLength, IsOptional, IsInt, Min, IsArray, IsDateString } from 'class-validator';

export class CreateAssignmentDto {
  @IsString() @MinLength(2)
  title!: string;

  @IsString()
  instruction!: string;

  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsOptional() @IsInt() @Min(1)
  maxScore?: number;

  @IsOptional() @IsArray() @IsString({ each: true })
  allowedExtensions?: string[];
}
