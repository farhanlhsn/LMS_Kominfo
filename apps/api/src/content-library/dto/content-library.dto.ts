import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateContentLibraryItemDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(["RICH_TEXT", "VIDEO", "FILE", "PDF", "LINK", "IMAGE", "THREE_D_MODEL"])
  type!: "RICH_TEXT" | "VIDEO" | "FILE" | "PDF" | "LINK" | "IMAGE" | "THREE_D_MODEL";

  @IsOptional()
  @IsString()
  fileId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateContentLibraryItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}
