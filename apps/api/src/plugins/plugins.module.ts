import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RbacModule } from "../rbac/rbac.module";
import { AdminPluginsController } from "./admin-plugins.controller";
import { PluginConfigService } from "./plugin-config.service";
import { PluginEventBus } from "./plugin-event-bus.service";
import { PluginExecutionLogger } from "./plugin-execution-logger.service";
import { PluginManifestValidator } from "./plugin-manifest-validator.service";
import { PluginPermissionService } from "./plugin-permission.service";
import { PluginRegistry } from "./plugin-registry.service";
import { PluginsController } from "./plugins.controller";

@Module({
  imports: [PrismaModule, RbacModule],
  controllers: [AdminPluginsController, PluginsController],
  providers: [
    PluginConfigService,
    PluginEventBus,
    PluginExecutionLogger,
    PluginManifestValidator,
    PluginPermissionService,
    PluginRegistry,
  ],
  exports: [
    PluginEventBus,
    PluginExecutionLogger,
    PluginPermissionService,
    PluginRegistry,
  ],
})
export class PluginsModule {}
