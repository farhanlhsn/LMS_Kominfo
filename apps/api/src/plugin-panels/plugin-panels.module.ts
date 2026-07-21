import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import {
  PluginPanelController,
  UserPanelLayoutController,
} from "./plugin-panels.controller";
import { PluginPanelService } from "./plugin-panels.service";

@Module({
  imports: [AuthModule, RbacModule],
  providers: [PrismaService, PluginPanelService],
  controllers: [PluginPanelController, UserPanelLayoutController],
  exports: [PluginPanelService],
})
export class PluginPanelsModule {}
