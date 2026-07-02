import { IsString, MinLength, MaxLength, IsEmail, IsOptional, IsIn, IsUUID, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsString() @MinLength(2) @MaxLength(100)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString() @MinLength(8) @MaxLength(100)
  password!: string;

  @IsUUID()
  regionId!: string;

  @IsOptional() @IsIn(['STUDENT', 'INSTRUCTOR', 'REGIONAL_ADMIN', 'SUPER_ADMIN'])
  role?: string;

  @IsOptional() @IsString()
  organization?: string;
}
