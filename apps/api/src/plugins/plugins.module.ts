import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RbacModule } from "../rbac/rbac.module";
import { AdminPluginsController } from "./admin-plugins.controller";
import { PluginConfigService } from "./plugin-config.service";
import { PluginEntitlementGuard } from "./guards/plugin-entitlement.guard";
import { PluginExecutionLogger } from "./plugin-execution-logger.service";
import { PluginManifestValidator } from "./plugin-manifest-validator.service";
import { PluginRegistry } from "./plugin-registry.service";
import { PluginSecretService } from "./plugin-secret.service";
import { PluginsController } from "./plugins.controller";

@Module({
  imports: [PrismaModule, RbacModule],
  controllers: [AdminPluginsController, PluginsController],
  providers: [
    PluginConfigService,
    PluginEntitlementGuard,
    PluginExecutionLogger,
    PluginManifestValidator,
    PluginRegistry,
    PluginSecretService,
  ],
  exports: [
    PluginExecutionLogger,
    PluginRegistry,
    PluginEntitlementGuard,
    PluginSecretService,
  ],
})
export class PluginsModule {}
