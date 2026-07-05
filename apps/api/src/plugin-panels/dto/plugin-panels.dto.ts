import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

export const PANEL_SIZES = ["sm", "md", "lg"] as const;
export const PANEL_POSITIONS = ["left", "right", "top", "bottom"] as const;
export type PanelSize = (typeof PANEL_SIZES)[number];
export type PanelPosition = (typeof PANEL_POSITIONS)[number];

export class PanelEntryDto {
  @IsString()
  @MinLength(1)
  panelKey!: string;

  @IsOptional()
  @IsIn(PANEL_SIZES as unknown as string[])
  size?: PanelSize;

  @IsOptional()
  @IsIn(PANEL_POSITIONS as unknown as string[])
  position?: PanelPosition;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class SavePanelLayoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PanelEntryDto)
  @ArrayMaxSize(50)
  panels!: PanelEntryDto[];
}

export class RegisterPluginPanelDto {
  @IsString()
  @MinLength(1)
  pluginId!: string;

  @IsString()
  @MinLength(1)
  panelKey!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsIn(PANEL_SIZES as unknown as string[])
  defaultSize?: PanelSize;

  @IsOptional()
  @IsIn(PANEL_POSITIONS as unknown as string[])
  defaultPosition?: PanelPosition;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoutes?: string[];

  @IsOptional()
  @IsObject()
  configSchema?: Record<string, unknown>;
}
