import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import { AdminLocaleController,LocaleController } from "./locale.controller";
import { LocaleService } from "./locale.service";

@Module({
  imports: [AuthModule, RbacModule],
  providers: [LocaleService],
  controllers: [LocaleController, AdminLocaleController],
  exports: [LocaleService],
})
export class LocaleModule {}
