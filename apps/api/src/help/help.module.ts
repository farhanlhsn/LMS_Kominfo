import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import {
  AdminHelpController,
  AdminSupportTicketController,
  HelpController,
  SupportTicketController,
} from "./help.controller";
import { HelpService } from "./help.service";

@Module({
  imports: [AuthModule, RbacModule],
  providers: [HelpService],
  controllers: [
    HelpController,
    AdminHelpController,
    SupportTicketController,
    AdminSupportTicketController,
  ],
  exports: [HelpService],
})
export class HelpModule {}
