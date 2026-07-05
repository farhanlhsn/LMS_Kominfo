import { IsArray, IsOptional, IsString, MinLength } from "class-validator";
import { Type } from "class-transformer";

export class UpdateLocalePreferenceDto {
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

export class UpdateOrgLocalePreferenceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  defaultLocale?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  supportedLocales?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  fallbackChain?: string[];
}
