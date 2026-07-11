import { Module } from "@nestjs/common";
import { RbacModule } from "../rbac/rbac.module";
import { EngagementModule } from "../engagement/engagement.module";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

@Module({
  imports: [RbacModule, EngagementModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService]
})
export class OrganizationsModule {}
