import { IsString, MinLength, MaxLength, IsOptional, IsIn, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
  name?: string;

  @IsOptional() @IsIn(['STUDENT', 'INSTRUCTOR', 'REGIONAL_ADMIN', 'SUPER_ADMIN'])
  role?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsString()
  organization?: string;

  @IsOptional() @IsString()
  bio?: string;
}
