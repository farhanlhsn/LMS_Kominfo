import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import type { AuthenticatedRequest } from "../auth/types/authenticated-request";
import {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import { GovernanceService } from "./governance.service";
import {
  ConsentCookieDto,
  CreateBackupJobDto,
  CreateLegalDocumentDto,
  CreateRetentionPolicyDto,
  ListLegalDocumentsQueryDto,
  RecordConsentDto,
  RequestAnonymizationDto,
  RequestDataExportDto,
  UpdateLegalDocumentDto,
  UpdateRetentionPolicyDto,
} from "./dto/governance.dto";

@Controller("governance")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class GovernanceController {
  constructor(
    @Inject(GovernanceService) private readonly service: GovernanceService,
  ) {}

  // Public-ish endpoints that any authenticated learner can call
  @Get("legal-documents")
  listLegalDocuments(
    @ActiveOrganization() org: OrganizationContext,
    @Query() query: ListLegalDocumentsQueryDto,
  ) {
    return this.service.listLegalDocuments(org, query.type);
  }

  @Get("legal-documents/latest")
  listLatestLegalDocuments(@ActiveOrganization() org: OrganizationContext) {
    return this.service.getLatestLegalDocuments(org);
  }

  @Post("consent")
  recordConsent(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordConsentDto,
  ) {
    return this.service.recordConsent(org, user.id, dto);
  }

  @Get("my-consents")
  listMyConsents(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.listMyConsents(org.id, user.id);
  }

  @Post("cookie-consent")
  recordCookieConsent(
    @ActiveOrganization() org: OrganizationContext,
    @Body() dto: ConsentCookieDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string | undefined) ??
      req.socket?.remoteAddress ??
      undefined;
    const userAgent = req.headers["user-agent"];
    return this.service.recordCookieConsent(
      org,
      dto,
      typeof ipAddress === "string" ? ipAddress : undefined,
      typeof userAgent === "string" ? userAgent : undefined,
    );
  }

  @Post("data-export")
  requestDataExport(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestDataExportDto,
  ) {
    return this.service.requestDataExport(org, user.id, dto);
  }

  @Get("data-export/preview")
  previewDataExport(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.previewDataExport(org, user.id);
  }

  @Post("anonymize-me")
  requestAnonymization(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestAnonymizationDto,
  ) {
    return this.service.requestAnonymization(org, user.id, dto);
  }
}

@Controller("governance/admin")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class GovernanceAdminController {
  constructor(
    @Inject(GovernanceService) private readonly service: GovernanceService,
  ) {}

  // ---- Legal document management (admin) ----
  @Post("legal-documents")
  @Permissions(PERMISSIONS.organizationsManage)
  createLegalDocument(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLegalDocumentDto,
  ) {
    return this.service.createLegalDocument(org, user.id, dto);
  }

  @Patch("legal-documents/:documentId")
  @Permissions(PERMISSIONS.organizationsManage)
  updateLegalDocument(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("documentId") documentId: string,
    @Body() dto: UpdateLegalDocumentDto,
  ) {
    return this.service.updateLegalDocument(org, user.id, documentId, dto);
  }

  @Get("data-export-requests")
  @Permissions(PERMISSIONS.usersRead)
  listDataExportRequests(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.listDataExportRequests(org, user.id);
  }

  @Get("retention-policies")
  @Permissions(PERMISSIONS.organizationsManage)
  listRetentionPolicies(@ActiveOrganization() org: OrganizationContext) {
    return this.service.listRetentionPolicies(org);
  }

  @Post("retention-policies")
  @Permissions(PERMISSIONS.organizationsManage)
  upsertRetentionPolicy(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRetentionPolicyDto,
  ) {
    return this.service.upsertRetentionPolicy(org, user.id, dto);
  }

  @Patch("retention-policies")
  @Permissions(PERMISSIONS.organizationsManage)
  updateRetentionPolicy(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRetentionPolicyDto & { entityType: string },
  ) {
    return this.service.upsertRetentionPolicy(org, user.id, dto);
  }

  @Get("backup-jobs")
  @Permissions(PERMISSIONS.organizationsManage)
  listBackupJobs(@ActiveOrganization() org: OrganizationContext) {
    return this.service.listBackupJobs(org);
  }

  @Post("backup-jobs")
  @Permissions(PERMISSIONS.organizationsManage)
  triggerBackupJob(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBackupJobDto,
  ) {
    return this.service.triggerBackupJob(org, user.id, dto);
  }
}
