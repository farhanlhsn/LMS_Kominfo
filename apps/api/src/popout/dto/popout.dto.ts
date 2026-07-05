import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class IssuePopoutTokenDto {
  @IsString()
  @MinLength(1)
  lessonId!: string;

  @IsOptional()
  @IsInt()
  @Min(60_000)
  ttlMs?: number;
}
