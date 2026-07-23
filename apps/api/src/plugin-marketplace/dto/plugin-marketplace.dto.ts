import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export const PLUGIN_LISTING_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "SUSPENDED",
  "ARCHIVED",
] as const;
export type PluginListingStatus = (typeof PLUGIN_LISTING_STATUSES)[number];

export const PLUGIN_INSTALLATION_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type PluginInstallationStatus =
  (typeof PLUGIN_INSTALLATION_STATUSES)[number];

export const PLUGIN_REVIEW_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export type PluginReviewStatus = (typeof PLUGIN_REVIEW_STATUSES)[number];

export class CreatePluginListingDto {
  @IsString()
  @MinLength(1)
  pluginId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  screenshots?: string[];

  @IsOptional()
  @IsObject()
  pricing?: Record<string, unknown>;
}

export class UpdatePluginListingDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  screenshots?: string[];

  @IsOptional()
  @IsObject()
  pricing?: Record<string, unknown>;
}

export class UpdatePluginListingStatusDto {
  @IsIn(PLUGIN_LISTING_STATUSES as unknown as string[])
  status!: PluginListingStatus;
}

export class CreatePluginReviewDto {
  @IsString()
  listingId!: string;

  @IsInt()
  @Min(1)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdatePluginReviewStatusDto {
  @IsIn(PLUGIN_REVIEW_STATUSES as unknown as string[])
  status!: PluginReviewStatus;
}

export class InstallPluginDto {
  @IsString()
  listingId!: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdatePluginInstallationStatusDto {
  @IsIn(PLUGIN_INSTALLATION_STATUSES as unknown as string[])
  status!: PluginInstallationStatus;
}

export class UpdatePluginPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  maxInstalls?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  allowedCategories?: string[];

  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;
}
