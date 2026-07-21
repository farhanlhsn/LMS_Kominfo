import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export const THREE_D_FORMATS = ["GLB", "GLTF", "FBX", "OBJ"] as const;
export type ThreeDFormat = (typeof THREE_D_FORMATS)[number];

export class CreateThreeDAssetDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(THREE_D_FORMATS)
  format!: ThreeDFormat;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @IsString()
  @MinLength(1)
  url!: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class UpdateThreeDAssetDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsIn(THREE_D_FORMATS)
  format?: ThreeDFormat;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class CreateThreeDSceneDto {
  @IsObject()
  scene!: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}

export class CreateThreeDInteractionDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  trigger!: string;

  @IsObject()
  action!: Record<string, unknown>;
}

export class ThreeDLightDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsOptional()
  @IsObject()
  position?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  color?: Record<string, unknown>;
}

export class ThreeDCameraDto {
  @IsOptional()
  @IsObject()
  position?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  target?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  type?: string;
}

export class ThreeDSceneConfigDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThreeDLightDto)
  lights?: ThreeDLightDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ThreeDCameraDto)
  camera?: ThreeDCameraDto;

  @IsOptional()
  @IsString()
  envmap?: string;

  @IsOptional()
  @IsArray()
  interactions?: Array<{
    name: string;
    trigger: string;
    action: Record<string, unknown>;
  }>;
}
