import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

export class UpdateModuleDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200)
  title?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsInt() @Min(0)
  order?: number;

  @IsOptional() @IsInt() @Min(0)
  estimatedDuration?: number;

  @IsOptional() @IsBoolean()
  isPublished?: boolean;
}
