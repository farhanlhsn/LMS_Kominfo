import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  SUPPORTED_CURRENCIES,
  TAX_RULE_TYPES,
  SupportedCurrency,
  TaxRuleType,
} from "../tax.provider";

export class CreateTaxRuleDto {
  @IsString()
  regionCode!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  rate!: number;

  @IsIn([...TAX_RULE_TYPES])
  type!: TaxRuleType;

  @IsOptional()
  inclusive?: boolean;

  @IsOptional()
  active?: boolean;
}

export class UpdateTaxRuleDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rate?: number;

  @IsOptional()
  inclusive?: boolean;

  @IsOptional()
  active?: boolean;
}

export class CalculateTaxDto {
  @IsInt()
  @Min(0)
  subtotal!: number;

  @IsString()
  regionCode!: string;

  @IsIn([...SUPPORTED_CURRENCIES])
  currency!: SupportedCurrency;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartLineDto)
  lines?: CartLineDto[];
}

export class CartLineDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateOrderCurrencyDto {
  @IsIn([...SUPPORTED_CURRENCIES])
  currency!: SupportedCurrency;
}
