import { Controller, Post, Get, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../auth/auth.controller';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface ReqUser { userId: string; role: string; regionId: string; }

@ApiTags('Certificates')
@ApiBearerAuth('JWT-auth')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post('generate/:courseId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate sertifikat setelah course selesai' })
  @ApiResponse({ status: 404, description: 'Course belum selesai atau belum enroll' })
  generateCertificate(
    @Param('courseId') courseId: string,
    @CurrentUser() user: ReqUser,
  ) {
    return this.certificatesService.generateCertificate(user.userId, courseId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mendapatkan daftar sertifikat milik user saat ini' })
  getMyCertificates(@CurrentUser() user: ReqUser) {
    return this.certificatesService.getMyCertificates(user.userId);
  }

  @Get('verify/:certNumber')
  @ApiOperation({ summary: 'Verifikasi sertifikat berdasarkan nomor (publik, untuk scan QR)' })
  verifyCertificate(@Param('certNumber') certNumber: string) {
    // This endpoint can be public for scanning QR codes
    return this.certificatesService.verifyCertificate(certNumber);
  }
}
