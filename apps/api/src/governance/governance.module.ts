import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import { GovernanceService } from "./governance.service";
import {
  GovernanceAdminController,
  GovernanceController,
} from "./governance.controller";

@Module({
  imports: [AuthModule, RbacModule],
  providers: [GovernanceService],
  controllers: [GovernanceController, GovernanceAdminController],
  exports: [GovernanceService],
})
export class GovernanceModule {}
