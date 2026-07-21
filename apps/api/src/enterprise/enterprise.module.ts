import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RbacModule } from "../rbac/rbac.module";
import { EnterpriseController, SsoLoginController } from "./enterprise.controller";
import { EnterpriseService } from "./enterprise.service";

@Module({
  imports: [PrismaModule, RbacModule],
  controllers: [EnterpriseController, SsoLoginController],
  providers: [EnterpriseService],
  exports: [EnterpriseService],
})
export class EnterpriseModule {}
