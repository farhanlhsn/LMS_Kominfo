import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Inject, UseGuards, Req } from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import type { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { EnterpriseService } from "./enterprise.service";
import { UpdateBrandingDto, CreateSsoProviderDto, UpdateSsoProviderDto, UpdateLoginPolicyDto, CreateDomainDto, CreateApiKeyDto, CreateWebhookDto, EnterpriseQueryDto } from "./dto/enterprise.dto";

@Controller("enterprise")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class EnterpriseController {
  constructor(
    @Inject(EnterpriseService) private readonly enterprise: EnterpriseService
  ) {}

  // ── Branding ─────────────────────────────────────────

  @Get("branding")
  async getBranding(@Req() req: AuthenticatedRequest) {
    return { data: await this.enterprise.getBranding(req.organization!.id) };
  }

  @Patch("branding")
  @Permissions(PERMISSIONS.organizationsManage)
  async updateBranding(@Req() req: AuthenticatedRequest, @Body() dto: UpdateBrandingDto) {
    return { data: await this.enterprise.updateBranding(req.organization!.id, dto) };
  }

  // ── SSO Providers ────────────────────────────────────

  @Get("sso-providers")
  @Permissions(PERMISSIONS.organizationsManage)
  async listProviders(@Req() req: AuthenticatedRequest) {
    return { data: await this.enterprise.listProviders(req.organization!) };
  }

  @Post("sso-providers")
  @Permissions(PERMISSIONS.organizationsManage)
  async createProvider(@Req() req: AuthenticatedRequest, @Body() dto: CreateSsoProviderDto) {
    return { data: await this.enterprise.createProvider(req.organization!, dto) };
  }

  @Patch("sso-providers/:id")
  @Permissions(PERMISSIONS.organizationsManage)
  async updateProvider(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: UpdateSsoProviderDto) {
    return { data: await this.enterprise.updateProvider(req.organization!, id, dto) };
  }

  @Delete("sso-providers/:id")
  @Permissions(PERMISSIONS.organizationsManage)
  async deleteProvider(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return await this.enterprise.deleteProvider(req.organization!, id);
  }

  // ── Login Policy ─────────────────────────────────────

  @Get("login-policy")
  async getLoginPolicy(@Req() req: AuthenticatedRequest) {
    return { data: await this.enterprise.getLoginPolicy(req.organization!.id) };
  }

  @Patch("login-policy")
  @Permissions(PERMISSIONS.organizationsManage)
  async updateLoginPolicy(@Req() req: AuthenticatedRequest, @Body() dto: UpdateLoginPolicyDto) {
    return { data: await this.enterprise.updateLoginPolicy(req.organization!.id, dto) };
  }

  // ── Domains ─────────────────────────────────────────

  @Get("domains")
  @Permissions(PERMISSIONS.organizationsManage)
  async listDomains(@Req() req: AuthenticatedRequest) {
    return { data: await this.enterprise.listDomains(req.organization!) };
  }

  @Post("domains")
  @Permissions(PERMISSIONS.organizationsManage)
  async createDomain(@Req() req: AuthenticatedRequest, @Body() dto: CreateDomainDto) {
    return { data: await this.enterprise.createDomain(req.organization!, dto) };
  }

  @Post("domains/:id/verify")
  @Permissions(PERMISSIONS.organizationsManage)
  async verifyDomain(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return { data: await this.enterprise.verifyDomain(req.organization!, id) };
  }

  @Delete("domains/:id")
  @Permissions(PERMISSIONS.organizationsManage)
  async deleteDomain(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return await this.enterprise.deleteDomain(req.organization!, id);
  }

  // ── API Keys ─────────────────────────────────────────

  @Post("api-keys")
  @Permissions(PERMISSIONS.organizationsManage)
  async createApiKey(@Req() req: AuthenticatedRequest, @Body() dto: CreateApiKeyDto) {
    return { data: await this.enterprise.createApiKey(req.organization!, req.user.id, dto) };
  }

  @Get("api-keys")
  @Permissions(PERMISSIONS.organizationsManage)
  async listApiKeys(@Req() req: AuthenticatedRequest) {
    return { data: await this.enterprise.listApiKeys(req.organization!) };
  }

  @Post("api-keys/:id/revoke")
  @Permissions(PERMISSIONS.organizationsManage)
  async revokeApiKey(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return { data: await this.enterprise.revokeApiKey(req.organization!, id) };
  }

  // ── Webhooks ─────────────────────────────────────────

  @Post("webhooks")
  @Permissions(PERMISSIONS.organizationsManage)
  async createWebhook(@Req() req: AuthenticatedRequest, @Body() dto: CreateWebhookDto) {
    return { data: await this.enterprise.createWebhook(req.organization!, req.user.id, dto) };
  }

  @Get("webhooks")
  @Permissions(PERMISSIONS.organizationsManage)
  async listWebhooks(@Req() req: AuthenticatedRequest) {
    return { data: await this.enterprise.listWebhooks(req.organization!) };
  }

  @Delete("webhooks/:id")
  @Permissions(PERMISSIONS.organizationsManage)
  async deleteWebhook(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return await this.enterprise.deleteWebhook(req.organization!, id);
  }

  @Get("webhooks/:endpointId/deliveries")
  @Permissions(PERMISSIONS.analyticsView)
  async getDeliveries(@Req() req: AuthenticatedRequest, @Param("endpointId") endpointId: string, @Query() query: EnterpriseQueryDto) {
    return this.enterprise.getWebhookDeliveries(req.organization!, endpointId, query);
  }
}
