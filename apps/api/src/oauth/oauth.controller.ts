import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { MfaEnrollDto,MfaVerifyDto,OAUTH_PROVIDERS,OAuthCallbackDto,OAuthProviderValue,OAuthStartDto } from "./dto/oauth.dto";
import { MfaService } from "./mfa.service";
import { OAuthService } from "./oauth.service";
import { SessionService } from "./session.service";

@Controller("auth/oauth")
export class OAuthController {
  constructor(@Inject(OAuthService) private readonly service: OAuthService) {}

  private normalizeProvider(raw: string): OAuthProviderValue {
    const upper = raw.toUpperCase();
    if ((OAUTH_PROVIDERS as readonly string[]).includes(upper)) {
      return upper as OAuthProviderValue;
    }
    throw new BadRequestException("Unsupported OAuth provider");
  }

  @Post(":provider/start")
  start(
    @Param("provider") provider: string,
    @Body() dto: OAuthStartDto,
  ) {
    const normalized = this.normalizeProvider(provider);
    return this.service.start(normalized, dto.redirectUri);
  }

  @Post(":provider/callback")
  callback(
    @Param("provider") provider: string,
    @Body() dto: OAuthCallbackDto,
    @ActiveOrganization() org: OrganizationContext | undefined,
  ) {
    const normalized = this.normalizeProvider(provider);
    return this.service.callback(normalized, dto.code, org?.id, dto.state);
  }
}

@Controller("auth/mfa")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class MfaController {
  constructor(@Inject(MfaService) private readonly service: MfaService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listFactors(user.id);
  }

  @Post("enroll")
  enroll(
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
    @Body() dto: MfaEnrollDto,
  ) {
    return this.service.enroll(org, user, dto.type);
  }

  @Post("verify")
  verify(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaVerifyDto) {
    return this.service.verify(user.id, dto.code);
  }

  @Delete("disable")
  disable(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MfaEnrollDto,
  ) {
    return this.service.disable(user.id, dto.type);
  }
}

@Controller("auth/sessions")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class SessionController {
  constructor(@Inject(SessionService) private readonly service: SessionService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listSessions(user.id);
  }

  @Delete(":id")
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.revokeSession(user, id);
  }

  @Delete()
  revokeAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.revokeAll(user);
  }
}

@Controller("auth/oauth/accounts")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class OAuthAccountController {
  constructor(
    @Inject(OAuthService) private readonly service: OAuthService,
    @Inject(MfaService) private readonly mfaService: MfaService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listAccounts(user.id);
  }

  @Post("link")
  async link(
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
    @Body() body: { provider: OAuthProviderValue; profile: {
      providerUserId: string;
      email?: string;
      raw?: Record<string, unknown>;
    } },
  ) {
    const account = await this.service.linkAccount(user.id, org, body.provider, {
      providerUserId: body.profile.providerUserId,
      email: body.profile.email,
      raw: body.profile.raw ?? {},
    });
    return account;
  }

  @Delete(":id")
  unlink(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.unlinkAccount(user.id, id);
  }
}

export function normalizeOAuthProvider(raw: string): OAuthProviderValue {
  return raw.toUpperCase() === "MICROSOFT"
    ? "MICROSOFT"
    : raw.toUpperCase() === "GOOGLE"
      ? "GOOGLE"
      : (() => {
          throw new Error("Unsupported OAuth provider");
        })();
}
