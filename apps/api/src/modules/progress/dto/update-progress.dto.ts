import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateProgressDto {
  @IsString()
  lessonId: string;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;

  @IsNumber()
  @IsOptional()
  videoPosition?: number;
}
