import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MockTaxProvider } from "./mock-tax.provider";
import { TAX_PROVIDER } from "./tax.provider";
import { AdminTaxController, TaxController } from "./tax.controller";
import { TaxService } from "./tax.service";

@Module({
  imports: [PrismaModule],
  controllers: [TaxController, AdminTaxController],
  providers: [
    TaxService,
    { provide: TAX_PROVIDER, useClass: MockTaxProvider },
  ],
  exports: [TaxService],
})
export class TaxModule {}
