import { IsString, MinLength, IsOptional, IsInt, Min, IsIn, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class CreateChoiceDto {
  @IsString() label!: string;
  @IsString() value!: string;
  @IsBoolean() isCorrect!: boolean;
}

export class CreateQuestionDto {
  @IsIn(['MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'TRUE_FALSE', 'ESSAY', 'MATCHING'])
  type!: string;

  @IsString() @MinLength(2)
  question!: string;

  @IsOptional() @IsString()
  explanation?: string;

  @IsOptional() @IsInt() @Min(1)
  score?: number;

  @IsOptional() @IsInt() @Min(0)
  order?: number;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateChoiceDto)
  choices?: CreateChoiceDto[];
}
