import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { RbacService } from "./rbac.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { OrganizationContextGuard } from "./guards/organization-context.guard";
import { PermissionsGuard } from "./guards/permissions.guard";
import { AccessContextService } from "./access-context.service";
import { ContextualRbacService } from "./contextual-rbac.service";
import { AccessControlService } from "./access-control.service";
import { AccessControlController } from "./access-control.controller";

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AccessControlController],
  providers: [
    RbacService,
    AccessContextService,
    ContextualRbacService,
    AccessControlService,
    JwtAuthGuard,
    OrganizationContextGuard,
    PermissionsGuard
  ],
  exports: [
    RbacService,
    AccessContextService,
    ContextualRbacService,
    AccessControlService,
    JwtAuthGuard,
    OrganizationContextGuard,
    PermissionsGuard,
    JwtModule
  ]
})
export class RbacModule {}
