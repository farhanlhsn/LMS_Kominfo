import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { RbacService } from "./rbac.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { OrganizationContextGuard } from "./guards/organization-context.guard";
import { PermissionsGuard } from "./guards/permissions.guard";

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    RbacService,
    JwtAuthGuard,
    OrganizationContextGuard,
    PermissionsGuard
  ],
  exports: [
    RbacService,
    JwtAuthGuard,
    OrganizationContextGuard,
    PermissionsGuard,
    JwtModule
  ]
})
export class RbacModule {}
