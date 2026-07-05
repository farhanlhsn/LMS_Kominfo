import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import {
  CreateCertificateTemplateDto,
  IssueCertificateDto,
  RevokeCertificateDto,
  UpdateCertificateTemplateDto,
} from "./dto/certificate.dto";
import { CertificatesService } from "./certificates.service";

@Controller("admin/certificate-templates")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class AdminCertificateTemplatesController {
  constructor(@Inject(CertificatesService) private readonly service: CertificatesService) {}

  @Get()
  @Permissions(PERMISSIONS.certificatesManage)
  list(@ActiveOrganization() org: OrganizationContext) {
    return this.service.listTemplates(org);
  }

  @Post()
  @Permissions(PERMISSIONS.certificatesManage)
  create(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCertificateTemplateDto) {
    return this.service.createTemplate(org, user.id, dto);
  }

  @Get(":templateId")
  @Permissions(PERMISSIONS.certificatesManage)
  get(@ActiveOrganization() org: OrganizationContext, @Param("templateId") templateId: string) {
    return this.service.getTemplate(org, templateId);
  }

  @Patch(":templateId")
  @Permissions(PERMISSIONS.certificatesManage)
  update(@ActiveOrganization() org: OrganizationContext, @Param("templateId") templateId: string, @Body() dto: UpdateCertificateTemplateDto) {
    return this.service.updateTemplate(org, templateId, dto);
  }

  @Delete(":templateId")
  @Permissions(PERMISSIONS.certificatesManage)
  delete(@ActiveOrganization() org: OrganizationContext, @Param("templateId") templateId: string) {
    return this.service.deleteTemplate(org, templateId);
  }
}

@Controller("instructor")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class InstructorCertificatesController {
  constructor(@Inject(CertificatesService) private readonly service: CertificatesService) {}

  @Get("courses/:courseId/certificates")
  @Permissions(PERMISSIONS.certificatesIssue)
  list(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("courseId") courseId: string) {
    return this.service.listCourseCertificates(org, user.id, courseId);
  }

  @Post("courses/:courseId/certificates/issue")
  @Permissions(PERMISSIONS.certificatesIssue)
  issue(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("courseId") courseId: string, @Body() dto: IssueCertificateDto) {
    return this.service.issue(org, user.id, courseId, dto);
  }

  @Post("certificates/:certificateId/revoke")
  @Permissions(PERMISSIONS.certificatesIssue)
  revoke(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("certificateId") certificateId: string, @Body() dto: RevokeCertificateDto) {
    return this.service.revoke(org, user.id, certificateId, dto);
  }

  @Post("certificates/:certificateId/generate-pdf")
  @Permissions(PERMISSIONS.certificatesIssue)
  generatePdf(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("certificateId") certificateId: string) {
    return this.service.regeneratePdf(org, user.id, certificateId);
  }

  @Get("certificates/:certificateId/download")
  @Permissions(PERMISSIONS.certificatesIssue)
  download(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("certificateId") certificateId: string) {
    return this.service.managedDownload(org, user.id, certificateId);
  }
}

@Controller("learn/certificates")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class LearnerCertificatesController {
  constructor(@Inject(CertificatesService) private readonly service: CertificatesService) {}

  @Get()
  list(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser) {
    return this.service.learnerCertificates(org.id, user.id);
  }

  @Get(":certificateId")
  get(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("certificateId") certificateId: string) {
    return this.service.learnerCertificate(org.id, user.id, certificateId);
  }

  @Get(":certificateId/download")
  download(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("certificateId") certificateId: string) {
    return this.service.learnerDownload(org, user.id, certificateId);
  }
}

@Controller("certificates")
export class PublicCertificateVerificationController {
  constructor(@Inject(CertificatesService) private readonly service: CertificatesService) {}

  @Get("verify/:verificationCode")
  verify(@Param("verificationCode") verificationCode: string) {
    return this.service.verify(verificationCode);
  }
}
