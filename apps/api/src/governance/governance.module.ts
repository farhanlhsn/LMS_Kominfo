import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import {
  GovernanceAdminController,
  GovernanceController,
} from "./governance.controller";
import { GovernanceService } from "./governance.service";

@Module({
  imports: [AuthModule, RbacModule],
  providers: [GovernanceService],
  controllers: [GovernanceController, GovernanceAdminController],
  exports: [GovernanceService],
})
export class GovernanceModule {}
