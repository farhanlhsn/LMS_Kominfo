import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class ListFilesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UploadFileBodyDto {
  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsIn(["PRIVATE", "ORGANIZATION", "COURSE", "PUBLIC"])
  visibility?: "PRIVATE" | "ORGANIZATION" | "COURSE" | "PUBLIC";

  @IsOptional()
  @IsIn([
    "OWNER",
    "INSTRUCTORS",
    "ENROLLED_LEARNERS",
    "ORGANIZATION_MEMBERS",
    "PUBLIC",
  ])
  accessLevel?:
    | "OWNER"
    | "INSTRUCTORS"
    | "ENROLLED_LEARNERS"
    | "ORGANIZATION_MEMBERS"
    | "PUBLIC";

  @IsOptional()
  @IsIn(["CONTENT", "THUMBNAIL", "ATTACHMENT", "VIDEO", "DOCUMENT", "BRANDING"])
  purpose?:
    "CONTENT" | "THUMBNAIL" | "ATTACHMENT" | "VIDEO" | "DOCUMENT" | "BRANDING";
}

export class SignedUrlDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(3600)
  expiresInSeconds?: number;
}

export class CreateFolderDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateFolderDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
