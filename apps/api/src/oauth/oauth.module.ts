import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import { CAPTCHA_PROVIDER,MockCaptchaProvider } from "./captcha.provider";
import { MfaService } from "./mfa.service";
import { MfaController,OAuthAccountController,OAuthController,SessionController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";
import { SessionService } from "./session.service";

@Module({
  imports: [AuthModule, RbacModule, JwtModule.register({})],
  providers: [
    OAuthService,
    MfaService,
    SessionService,
    {
      provide: CAPTCHA_PROVIDER,
      useClass: MockCaptchaProvider,
    },
  ],
  controllers: [
    OAuthController,
    MfaController,
    SessionController,
    OAuthAccountController,
  ],
  exports: [OAuthService, MfaService, SessionService, CAPTCHA_PROVIDER],
})
export class OAuthModule {}
