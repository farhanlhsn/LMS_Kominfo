import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateCourseDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsIn(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"])
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";

  @IsOptional()
  @IsIn(["PUBLIC", "PRIVATE", "ORGANIZATION_ONLY", "INVITE_ONLY"])
  visibility?: "PUBLIC" | "PRIVATE" | "ORGANIZATION_ONLY" | "INVITE_ONLY";
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsIn(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"])
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";

  @IsOptional()
  @IsIn(["PUBLIC", "PRIVATE", "ORGANIZATION_ONLY", "INVITE_ONLY"])
  visibility?: "PUBLIC" | "PRIVATE" | "ORGANIZATION_ONLY" | "INVITE_ONLY";

  @IsOptional()
  @IsBoolean()
  autoCertificate?: boolean;

  @IsOptional()
  @IsString()
  autoCertificateTemplateId?: string | null;
}

export class CreateModuleDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateModuleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class CreateLessonDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;
}

export class CreateActivityDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  activityTypeKey!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  content?: Record<string, unknown>;
}

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  content?: Record<string, unknown>;
}

export class ReorderDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export class UpdateActivityProgressDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  progressPercent?: number;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
