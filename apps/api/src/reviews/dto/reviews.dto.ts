import { IsString, IsOptional, IsInt, IsEnum, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class CreateReviewDto {
  @IsString()
  courseId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1) @Max(5)
  rating: number;

  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  body?: string;
}

export class ModerateReviewDto {
  @IsOptional() @IsString()
  status?: string;
}

export class AddWishlistDto {
  @IsString()
  courseId: string;
}

export class FavoriteInstructorDto {
  @IsString()
  instructorId: string;
}

export class ReviewQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number = 20;

  @IsOptional() @IsString()
  status?: string;
}
