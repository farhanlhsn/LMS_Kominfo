import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsInt, Min, Max } from 'class-validator';

export class AskAiDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  lessonId?: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}

export enum SummaryLength {
  SHORT = 'SHORT',
  MEDIUM = 'MEDIUM',
  LONG = 'LONG',
}

export enum SummaryLanguage {
  ID = 'id',
  EN = 'en',
}

export class SummaryDto {
  /** Jika lessonId diisi, akan meringkas materi lesson tersebut */
  @IsString()
  @IsOptional()
  lessonId?: string;

  /** Alternatif: teks bebas yang akan diringkas */
  @IsString()
  @IsOptional()
  text?: string;

  @IsEnum(SummaryLength)
  @IsOptional()
  length?: SummaryLength = SummaryLength.MEDIUM;

  @IsEnum(SummaryLanguage)
  @IsOptional()
  language?: SummaryLanguage = SummaryLanguage.ID;
}

export class QuizGeneratorDto {
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  numQuestions?: number = 5;
}

export class EssayReviewDto {
  @IsString()
  @IsNotEmpty()
  essay: string;

  /** Rubrik penilaian opsional (jika tidak ada, gunakan rubrik default) */
  @IsString()
  @IsOptional()
  rubric?: string;

  @IsString()
  @IsOptional()
  lessonId?: string;
}

export class RecommendationDto {
  /** Reserved untuk filter (e.g. category, difficulty) di masa depan */
  @IsString()
  @IsOptional()
  context?: string;
}

export class TriggerIngestionDto {
  @IsString()
  @IsNotEmpty()
  lessonId: string;
}
