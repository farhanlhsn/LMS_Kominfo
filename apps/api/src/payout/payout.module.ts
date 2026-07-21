import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminPayoutController, PayoutsController } from "./payout.controller";
import { PayoutService } from "./payout.service";

@Module({
  imports: [PrismaModule],
  controllers: [AdminPayoutController, PayoutsController],
  providers: [PayoutService],
  exports: [PayoutService],
})
export class PayoutModule {}
