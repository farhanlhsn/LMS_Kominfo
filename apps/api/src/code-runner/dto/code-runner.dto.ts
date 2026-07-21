import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  SUPPORTED_LANGUAGES,
  type CodeLanguage,
} from "../sandbox.provider";

export class TestCaseInput {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  input?: string;

  @IsString()
  expectedOutput!: string;
}

export class ExecuteCodeDto {
  @IsIn(SUPPORTED_LANGUAGES as unknown as string[])
  language!: CodeLanguage;

  @IsString()
  @MinLength(1)
  code!: string;

  @IsOptional()
  @IsString()
  stdin?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  timeoutMs?: number;
}

export class JudgeCodeDto {
  @IsIn(SUPPORTED_LANGUAGES as unknown as string[])
  language!: CodeLanguage;

  @IsString()
  @MinLength(1)
  code!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestCaseInput)
  @ArrayMaxSize(50)
  testCases!: TestCaseInput[];

  @IsOptional()
  @IsInt()
  @Min(100)
  timeoutMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  scoreWeight?: number;
}

export class CodeSubmissionQueryDto {
  @IsOptional()
  @IsString()
  assignmentId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
