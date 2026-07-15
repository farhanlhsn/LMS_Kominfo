import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateUserStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED", "DEACTIVATED"])
  status!: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
}
