import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class UpdateBrandingDto {
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() faviconUrl?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() secondaryColor?: string;
  @IsOptional() @IsString() accentColor?: string;
  @IsOptional() @IsString() borderRadius?: string;
}

export class CreateSsoProviderDto {
  @IsString() type: string;
  @IsString() name: string;
  @IsString() issuer: string;
  @IsOptional() @IsString() entityId?: string;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() clientSecret?: string;
  @IsOptional() @IsString() metadataUrl?: string;
  @IsOptional() @IsString() callbackUrl?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

export class UpdateSsoProviderDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() issuer?: string;
  @IsOptional() @IsString() entityId?: string;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() clientSecret?: string;
  @IsOptional() @IsString() metadataUrl?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

export class UpdateLoginPolicyDto {
  @IsOptional() @IsBoolean() allowPasswordLogin?: boolean;
  @IsOptional() @IsBoolean() allowSocialLogin?: boolean;
  @IsOptional() @IsBoolean() allowSsoLogin?: boolean;
  @IsOptional() @IsBoolean() requireSsoForVerifiedDomains?: boolean;
  @IsOptional() @IsBoolean() jitProvisioningEnabled?: boolean;
  @IsOptional() @IsBoolean() inviteOnly?: boolean;
  @IsOptional() @IsBoolean() mfaRequired?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(60) sessionTtlMinutes?: number;
}

export class CreateDomainDto {
  @IsString() domain: string;
  @IsOptional() @IsString() ssoProviderId?: string;
  @IsOptional() @IsBoolean() enforceSso?: boolean;
  @IsOptional() @IsBoolean() autoJoinEnabled?: boolean;
}

export class CreateApiKeyDto {
  @IsString() name: string;
  @IsOptional() @IsArray() @IsString({ each: true }) scopes?: string[];
  @IsOptional() @IsString() expiresAt?: string;
}

export class CreateWebhookDto {
  @IsString() name: string;
  @IsString() url: string;
  @IsArray() @IsString({ each: true }) events: string[];
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsInt() retryCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() timeoutMs?: number;
}

export class EnterpriseQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}
