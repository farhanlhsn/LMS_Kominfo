import {
  IsBooleanString,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MinLength
} from "class-validator";

export const OAUTH_PROVIDERS = ["GOOGLE", "MICROSOFT"] as const;
export type OAuthProviderValue = (typeof OAUTH_PROVIDERS)[number];

// ---------- OAuth DTOs ----------

export class OAuthStartDto {
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  redirectUri?: string;
}

export class OAuthCallbackDto {
  @IsString()
  @MinLength(4)
  code!: string;

  @IsOptional()
  @IsString()
  state?: string;
}

// ---------- MFA DTOs ----------

export class MfaEnrollDto {
  @IsIn(["TOTP", "BACKUP_CODE"])
  type!: "TOTP" | "BACKUP_CODE";
}

export class MfaVerifyDto {
  @IsString()
  @Length(6, 64)
  code!: string;
}

// ---------- Session DTOs ----------

export class RevokeSessionDto {
  @IsOptional()
  @IsBooleanString()
  confirmAll?: string;
}
