import { IsString, MinLength, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';

export class CreateQuizDto {
  @IsString() @MinLength(2)
  title!: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsInt() @Min(0) @Max(100)
  passingScore?: number;

  @IsOptional() @IsInt() @Min(0)
  durationMinutes?: number;

  @IsOptional() @IsInt() @Min(1)
  maxAttempt?: number;

  @IsOptional() @IsBoolean()
  shuffleQuestion?: boolean;

  @IsOptional() @IsBoolean()
  shuffleChoice?: boolean;
}
