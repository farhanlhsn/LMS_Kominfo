import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export const LEGAL_DOCUMENT_TYPES = [
  "PRIVACY_POLICY",
  "TERMS",
  "COOKIE_POLICY",
  "DPA",
] as const;

export type LegalDocumentTypeValue = (typeof LEGAL_DOCUMENT_TYPES)[number];

// ---------- Legal document DTOs ----------

export class CreateLegalDocumentDto {
  @IsIn(LEGAL_DOCUMENT_TYPES)
  type!: LegalDocumentTypeValue;

  @IsString()
  @MinLength(1)
  version!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsDateString()
  effectiveAt!: string;

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}

export class UpdateLegalDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsDateString()
  effectiveAt?: string;

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}

export class ListLegalDocumentsQueryDto {
  @IsOptional()
  @IsIn(LEGAL_DOCUMENT_TYPES)
  type?: LegalDocumentTypeValue;
}

// ---------- Consent DTOs ----------

export class RecordConsentDto {
  @IsIn(LEGAL_DOCUMENT_TYPES)
  documentType!: LegalDocumentTypeValue;

  @IsString()
  @MinLength(1)
  documentVersion!: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class ConsentCookieDto {
  @IsBoolean()
  necessary!: boolean;

  @IsBoolean()
  analytics!: boolean;

  @IsBoolean()
  marketing!: boolean;

  @IsOptional()
  @IsBoolean()
  preferences?: boolean;

  @IsString()
  @MinLength(1)
  sessionId!: string;
}

// ---------- Data export / anonymization DTOs ----------

export class RequestDataExportDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RequestAnonymizationDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  confirm?: boolean;
}

// ---------- Retention policy DTOs ----------

export class CreateRetentionPolicyDto {
  @IsString()
  @MinLength(1)
  entityType!: string;

  @IsInt()
  @Min(1)
  retentionDays!: number;

  @IsOptional()
  @IsBoolean()
  anonymize?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRetentionPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  retentionDays?: number;

  @IsOptional()
  @IsBoolean()
  anonymize?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

// ---------- Backup job DTOs ----------

export class CreateBackupJobDto {
  @IsIn(["FULL", "INCREMENTAL"])
  type!: "FULL" | "INCREMENTAL";

  @IsOptional()
  @IsString()
  notes?: string;
}
