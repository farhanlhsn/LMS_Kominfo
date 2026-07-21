import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import { PopoutController } from "./popout.controller";
import { PopoutService } from "./popout.service";

@Module({
  imports: [AuthModule, RbacModule],
  providers: [PrismaService, PopoutService],
  controllers: [PopoutController],
  exports: [PopoutService],
})
export class PopoutModule {}
