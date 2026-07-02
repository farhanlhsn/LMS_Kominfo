import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryUserDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 10;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsIn(['STUDENT', 'INSTRUCTOR', 'REGIONAL_ADMIN', 'SUPER_ADMIN'])
  role?: string;

  @IsOptional() @IsString()
  regionId?: string;

  @IsOptional() @IsIn(['true', 'false'])
  isActive?: string;

  @IsOptional() @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional() @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
