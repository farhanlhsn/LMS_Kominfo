import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import {
  ModerationAdminController,
  ModerationController,
} from "./moderation.controller";
import { ModerationService } from "./moderation.service";

@Module({
  imports: [AuthModule, RbacModule],
  providers: [ModerationService],
  controllers: [ModerationController, ModerationAdminController],
  exports: [ModerationService],
})
export class ModerationModule {}
