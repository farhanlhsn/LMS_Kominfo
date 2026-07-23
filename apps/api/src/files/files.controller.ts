import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { PERMISSIONS } from "@lms/shared";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import {
  CreateFolderDto,
  ListFilesDto,
  SignedUrlDto,
  UpdateFolderDto,
  UploadFileBodyDto,
} from "./dto/files.dto";
import { FilesService } from "./files.service";

@Controller("files")
export class FileContentController {
  constructor(
    @Inject(FilesService) private readonly filesService: FilesService,
  ) {}

  @Get("public/:id")
  async publicContent(
    @Param("id") fileId: string,
    @Res() response: Response,
  ) {
    const file = await this.filesService.publicContent(fileId);
    this.send(response, file, "public, max-age=86400");
  }

  @Get("content/:id")
  async signedContent(
    @Param("id") fileId: string,
    @Query("expires") expires: string,
    @Query("token") token: string,
    @Res() response: Response,
  ) {
    const file = await this.filesService.signedContent(fileId, expires, token);
    this.send(response, file, "private, max-age=60");
  }

  private send(
    response: Response,
    file: { body: Buffer; mimeType: string; filename: string },
    cacheControl: string,
  ) {
    const filename = file.filename.replace(/["\r\n]/g, "_");
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("Content-Length", String(file.body.length));
    response.setHeader(
      "Content-Disposition",
      `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    );
    response.setHeader("Cache-Control", cacheControl);
    response.send(file.body);
  }
}

@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class FilesController {
  constructor(
    @Inject(FilesService) private readonly filesService: FilesService,
  ) {}

  @Post("files/upload")
  @Permissions(PERMISSIONS.filesCreate)
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileBodyDto,
  ) {
    return this.filesService.upload(organization, user, file, dto);
  }

  @Get("files")
  @Permissions(PERMISSIONS.filesRead)
  list(
    @ActiveOrganization() organization: OrganizationContext,
    @Query() query: ListFilesDto,
  ) {
    return this.filesService.list(organization.id, query);
  }

  @Get("files/:id")
  @Permissions(PERMISSIONS.filesRead)
  get(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") fileId: string,
  ) {
    return this.filesService.get(organization, user.id, fileId);
  }

  @Delete("files/:id")
  @Permissions(PERMISSIONS.filesDelete)
  delete(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") fileId: string,
  ) {
    return this.filesService.delete(organization, user.id, fileId);
  }

  @Post("files/:id/signed-url")
  @Permissions(PERMISSIONS.filesRead)
  signedUrl(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") fileId: string,
    @Body() dto: SignedUrlDto,
  ) {
    return this.filesService.signedUrl(organization, user.id, fileId, dto);
  }

  @Get("folders")
  @Permissions(PERMISSIONS.filesRead)
  folders(@ActiveOrganization() organization: OrganizationContext) {
    return this.filesService.listFolders(organization.id);
  }

  @Post("folders")
  @Permissions(PERMISSIONS.filesCreate)
  createFolder(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFolderDto,
  ) {
    return this.filesService.createFolder(organization, user.id, dto);
  }

  @Patch("folders/:id")
  @Permissions(PERMISSIONS.filesCreate)
  updateFolder(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") folderId: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.filesService.updateFolder(organization.id, folderId, dto);
  }

  @Delete("folders/:id")
  @Permissions(PERMISSIONS.filesDelete)
  deleteFolder(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") folderId: string,
  ) {
    return this.filesService.deleteFolder(organization.id, folderId);
  }
}
