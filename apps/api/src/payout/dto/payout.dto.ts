import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export const REVENUE_SCOPES = ["PLATFORM", "INSTRUCTOR", "COURSE"] as const;
export type RevenueShareScope = (typeof REVENUE_SCOPES)[number];

export const PAYOUT_PERIOD_STATUSES = ["OPEN", "LOCKED", "PAID"] as const;
export type PayoutPeriodStatus = (typeof PAYOUT_PERIOD_STATUSES)[number];

export const PAYOUT_BENEFICIARY_TYPES = [
  "INSTRUCTOR",
  "ORG",
  "PLATFORM",
] as const;
export type PayoutBeneficiaryType =
  (typeof PAYOUT_BENEFICIARY_TYPES)[number];

export const PAYOUT_STATUSES = [
  "PENDING",
  "APPROVED",
  "PAID",
  "FAILED",
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYOUT_METHOD_TYPES = ["BANK", "PAYPAL", "STRIPE"] as const;
export type PayoutMethodType = (typeof PAYOUT_METHOD_TYPES)[number];

export class CreateRevenueShareRuleDto {
  @IsIn([...REVENUE_SCOPES])
  scope!: RevenueShareScope;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  percent!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreatePayoutMethodDto {
  @IsIn([...PAYOUT_BENEFICIARY_TYPES])
  beneficiaryType!: PayoutBeneficiaryType;

  @IsString()
  beneficiaryId!: string;

  @IsIn([...PAYOUT_METHOD_TYPES])
  type!: PayoutMethodType;

  @IsObject()
  details!: Record<string, unknown>;
}

export class CreatePayoutPeriodDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class LockPayoutPeriodDto {
  @IsOptional()
  @IsString()
  currency?: string;
}

export class PayPayoutDto {
  @IsOptional()
  @IsString()
  reference?: string;
}

export class UpdateRevenueShareRuleDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percent?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class BatchLockPayoutPeriodDto {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class PayoutFilterDto {
  @IsOptional()
  @IsIn([...PAYOUT_STATUSES])
  status?: PayoutStatus;

  @IsOptional()
  @IsString()
  beneficiaryId?: string;
}
