import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import { PluginsModule } from "../plugins/plugins.module";
import {
  PluginInstallationController,
  PluginListingController,
  PluginPolicyController,
  PluginReviewController,
} from "./plugin-marketplace.controller";
import { PluginMarketplaceService } from "./plugin-marketplace.service";

@Module({
  imports: [AuthModule, RbacModule, PluginsModule],
  providers: [PrismaService, PluginMarketplaceService],
  controllers: [
    PluginListingController,
    PluginReviewController,
    PluginInstallationController,
    PluginPolicyController,
  ],
  exports: [PluginMarketplaceService],
})
export class PluginMarketplaceModule {}
