import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength
} from "class-validator";

export const SUPPORT_TICKET_STATUSES = [
  "OPEN",
  "PENDING",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
] as const;

export const SUPPORT_TICKET_PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
] as const;

export class CreateHelpCategoryDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

export class UpdateHelpCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

export class CreateHelpArticleDto {
  @IsString()
  @MinLength(1)
  categoryId!: string;

  @IsString()
  @MinLength(1)
  slug!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsIn(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export class UpdateHelpArticleDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(3)
  body!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(SUPPORT_TICKET_PRIORITIES as unknown as string[])
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
}

export class CreateSupportTicketReplyDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsIn(SUPPORT_TICKET_STATUSES as unknown as string[])
  status?: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED" | "REJECTED";

  @IsOptional()
  @IsIn(SUPPORT_TICKET_PRIORITIES as unknown as string[])
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";

  @IsOptional()
  @IsString()
  assignedToId?: string;
}

export class HelpListQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class SupportTicketListQueryDto {
  @IsOptional()
  @IsIn(SUPPORT_TICKET_STATUSES as unknown as string[])
  status?: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED" | "REJECTED";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class LocalePreferenceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  locale?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  fallbackChain?: string[];
}
