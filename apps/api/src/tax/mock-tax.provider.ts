import { Injectable } from "@nestjs/common";
import {
  TaxBreakdown,
  TaxProvider,
  TaxRuleType,
} from "./tax.provider";

@Injectable()
export class MockTaxProvider implements TaxProvider {
  getIdentifier(): string {
    return "mock";
  }

  computeTax(
    subtotal: number,
    rules: Array<{ rate: number; inclusive: boolean; type: TaxRuleType }>,
  ): TaxBreakdown {
    const lines = rules.map((rule) => {
      const amount = Math.max(0, Math.round((subtotal * rule.rate) / 100));
      return { ...rule, amount };
    });
    const taxAmount = lines.reduce((sum, line) => sum + line.amount, 0);
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
      currency: "USD",
      lines,
    };
  }
}
