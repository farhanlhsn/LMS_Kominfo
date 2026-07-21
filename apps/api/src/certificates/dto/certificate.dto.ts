import {
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateCertificateTemplateDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  design?: Record<string, unknown>;

  @IsOptional()
  @IsIn(["DRAFT", "ACTIVE", "ARCHIVED"])
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateCertificateTemplateDto extends CreateCertificateTemplateDto {}

export class IssueCertificateDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class RevokeCertificateDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
