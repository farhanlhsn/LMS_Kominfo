import { IsString, IsOptional, IsInt, IsBoolean, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { IsDateString } from "class-validator";

export class SetCoursePricingDto {
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class CreateCouponDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxUses?: number;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class CreateOrderDto {
  @IsString({ each: true })
  courseIds: string[];

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConfirmPaymentDto {
  @IsString()
  paymentId: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  proofImageUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApprovePaymentDto {
  @IsString()
  paymentId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSubscriptionPlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  interval?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  intervalCount?: number;

  @IsOptional()
  @IsString()
  courseAccess?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxEnrollments?: number;
}

export class MarketplaceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;
}
