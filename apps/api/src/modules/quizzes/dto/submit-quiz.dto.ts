import { IsArray } from 'class-validator';

export class SubmitQuizDto {
  @IsArray()
  answers!: { questionId: string; answer: unknown }[];
}
