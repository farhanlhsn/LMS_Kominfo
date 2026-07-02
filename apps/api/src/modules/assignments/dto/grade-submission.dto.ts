import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';

export class GradeSubmissionDto {
  @IsInt() @Min(0) @Max(1000)
  score!: number;

  @IsOptional() @IsString()
  feedback?: string;
}
