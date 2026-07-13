import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import type {
  AuthenticatedRequest,
  AuthenticatedUser
} from "./types/authenticated-request";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { SwitchOrganizationDto } from "./dto/switch-organization.dto";
import { ForgotPasswordDto, ResetPasswordDto } from "./dto/password-reset.dto";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto, @Req() request: Request): Promise<unknown> {
    return this.authService.register(dto, this.metadata(request));
  }

  @Post("login")
  login(@Body() dto: LoginDto, @Req() request: Request): Promise<unknown> {
    return this.authService.login(dto, this.metadata(request));
  }

  @Post("refresh")
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request
  ): Promise<unknown> {
    return this.authService.refresh(dto.refreshToken, this.metadata(request));
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.authService.me(user);
  }

  @Get("organizations")
  @UseGuards(JwtAuthGuard)
  organizations(@CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.authService.getOrganizations(user.id);
  }

  @Post("switch-organization")
  @UseGuards(JwtAuthGuard)
  switchOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SwitchOrganizationDto,
    @Req() request: AuthenticatedRequest
  ): Promise<unknown> {
    return this.authService.switchOrganization(
      user,
      dto.organizationId,
      this.metadata(request)
    );
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest
  ): Promise<unknown> {
    return this.authService.logout(user, this.metadata(request));
  }

  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<unknown> {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto): Promise<unknown> {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  private metadata(request: Request) {
    const userAgent = request.headers["user-agent"];

    return {
      ipAddress: request.ip,
      userAgent: Array.isArray(userAgent) ? userAgent.join(" ") : userAgent
    };
  }
}
