import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsIn, IsUUID } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @IsUUID()
  regionId!: string;

  @IsOptional()
  @IsIn(['STUDENT', 'INSTRUCTOR'])
  role?: 'STUDENT' | 'INSTRUCTOR';
}
