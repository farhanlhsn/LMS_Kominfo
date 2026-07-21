import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RbacModule } from "../rbac/rbac.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [RbacModule, EmailModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
