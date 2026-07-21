export const TAX_RULE_TYPES = ["VAT", "GST", "SALES_TAX"] as const;
export type TaxRuleType = (typeof TAX_RULE_TYPES)[number];

export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "IDR",
  "SGD",
  "MYR",
  "AUD",
  "JPY",
  "INR",
  "BRL",
] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface TaxBreakdownLine {
  type: TaxRuleType;
  rate: number;
  amount: number;
  inclusive: boolean;
}

export interface TaxBreakdown {
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  lines: TaxBreakdownLine[];
}

export interface TaxProvider {
  getIdentifier(): string;
  computeTax(
    subtotal: number,
    rules: Array<{ rate: number; inclusive: boolean; type: TaxRuleType }>,
  ): TaxBreakdown;
}

export const TAX_PROVIDER = Symbol("TAX_PROVIDER");
