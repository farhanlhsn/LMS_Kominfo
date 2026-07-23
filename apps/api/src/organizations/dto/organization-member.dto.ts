import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";
import { ACCESS_CONTEXT_TYPES, type AccessContextType } from "@lms/shared";

export class CreateOrganizationMemberDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleKeys?: string[];
}

export class UpdateOrganizationMemberRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleKeys!: string[];
}

export class UpdateOrganizationMemberStatusDto {
  @IsIn(["INVITED", "ACTIVE", "SUSPENDED", "DEACTIVATED"])
  status!: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
}

export class CreateOrganizationRoleDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_-]*$/)
  key!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(ACCESS_CONTEXT_TYPES, { each: true })
  assignableContextTypes?: AccessContextType[];
}

export class InviteOrganizationMemberDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleKeys?: string[];

  @IsOptional()
  @IsString()
  message?: string;
}

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[a-z][a-z0-9-]*$/)
  slug!: string;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsIn(["ACTIVE", "SUSPENDED"])
  status?: "ACTIVE" | "SUSPENDED";
}

export class UpdateOrganizationRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(ACCESS_CONTEXT_TYPES, { each: true })
  assignableContextTypes?: AccessContextType[];
}
