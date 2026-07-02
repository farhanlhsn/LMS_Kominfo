import { IsString, MinLength, MaxLength, IsOptional, IsHexColor, IsUrl, IsBoolean } from 'class-validator';

export class UpdateRegionDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(50)
  name?: string;

  @IsOptional() @IsHexColor()
  themeColor?: string;

  @IsOptional() @IsUrl()
  logoUrl?: string;

  @IsOptional() @IsUrl()
  bannerUrl?: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
