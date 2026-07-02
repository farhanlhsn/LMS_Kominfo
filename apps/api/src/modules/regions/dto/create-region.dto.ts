import { IsString, MinLength, MaxLength, IsOptional, IsHexColor, IsUrl } from 'class-validator';

export class CreateRegionDto {
  @IsString() @MinLength(2) @MaxLength(50)
  name!: string;

  @IsString() @MinLength(2) @MaxLength(50)
  slug!: string;

  @IsOptional() @IsHexColor()
  themeColor?: string;

  @IsOptional() @IsUrl()
  logoUrl?: string;

  @IsOptional() @IsUrl()
  bannerUrl?: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;
}
