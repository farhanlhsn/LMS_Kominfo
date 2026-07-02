import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Get,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MaterialsService } from './materials.service';
import { JwtAuthGuard } from '../auth/auth.controller';

// Inline CurrentUser decorator
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface ReqUser { userId: string; role: string; regionId: string; }

@ApiTags('Materials')
@ApiBearerAuth('JWT-auth')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload file materi (PDF/gambar/video/audio/dokumen, maks 100MB)' })
  uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB
          // FileTypeValidator: paksa extensi agar client tidak bisa upload executable
          new FileTypeValidator({
            fileType: /^(image\/(jpeg|jpg|png|webp|gif)|application\/(pdf|zip|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml|spreadsheetml|presentationml)\.document|spreadsheetml|presentationml)|video\/(mp4|webm|quicktime)|audio\/(mpeg|wav|ogg)|text\/(plain|markdown|csv))$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: ReqUser,
  ) {
    return this.materialsService.uploadFile(file, user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mendapatkan metadata material berdasarkan ID' })
  getMaterial(@Param('id') id: string) {
    return this.materialsService.getMaterial(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Menghapus material (soft-delete + hapus dari storage)' })
  remove(@Param('id') id: string, @CurrentUser() user: ReqUser) {
    return this.materialsService.remove(id, user.userId, user.role);
  }
}
