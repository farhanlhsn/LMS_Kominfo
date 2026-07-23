import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
} from "class-validator";
import {
  ACCESS_CONTEXT_TYPES,
  CAPABILITY_EFFECTS,
  type AccessContextType,
  type CapabilityEffect,
} from "@lms/shared";

export class AccessContextReferenceDto {
  @IsIn(ACCESS_CONTEXT_TYPES)
  contextType!: AccessContextType;

  @IsString()
  contextInstanceId!: string;
}

export class AssignContextRoleDto extends AccessContextReferenceDto {
  @IsString()
  userId!: string;

  @IsString()
  roleId!: string;

  @IsOptional()
  @IsString()
  sourceComponent?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class SetCapabilityOverrideDto extends AccessContextReferenceDto {
  @IsString()
  roleId!: string;

  @IsString()
  permissionKey!: string;

  @IsIn(CAPABILITY_EFFECTS)
  effect!: CapabilityEffect;
}

export class SetRoleDelegationDto {
  @IsString()
  actorRoleId!: string;

  @IsString()
  targetRoleId!: string;

  @IsBoolean()
  canView!: boolean;

  @IsBoolean()
  canAssign!: boolean;

  @IsBoolean()
  canOverride!: boolean;

  @IsBoolean()
  canSwitch!: boolean;
}

export class SimulateAccessDto extends AccessContextReferenceDto {
  @IsString()
  userId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  permissionKeys!: string[];

  @IsOptional()
  @IsBoolean()
  ignoreAdminBypass?: boolean;
}

export class SwitchRoleDto extends AccessContextReferenceDto {
  @IsString()
  roleId!: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class DeactivateRoleDto {
  @IsString()
  confirmKey!: string;
}
