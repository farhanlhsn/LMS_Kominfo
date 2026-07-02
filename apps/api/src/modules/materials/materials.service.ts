import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/common/storage/storage.service';

/** MIME types & ekstensi yang diizinkan di LMS */
const ALLOWED_MIME_TYPES = new Set<string>([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/zip',
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'text/plain', 'text/markdown', 'text/csv',
]);
const BLOCKED_EXTENSIONS = new Set<string>(['exe', 'bat', 'cmd', 'sh', 'msi', 'dll', 'so', 'jar']);
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB sesuai DoD

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async uploadFile(file: Express.Multer.File, userId: string) {
    try {
      const extension = (file.originalname.split('.').pop() || '').toLowerCase();
      const extWithoutDot = extension.replace(/^\./, '');

      // Validasi MIME & ekstensi (anti-upload executable sesuai AGENTS.md)
      if (BLOCKED_EXTENSIONS.has(extWithoutDot)) {
        throw new InternalServerErrorException(`Extension .${extWithoutDot} tidak diizinkan.`);
      }
      if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new InternalServerErrorException(`Tipe file ${file.mimetype} tidak diizinkan.`);
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new InternalServerErrorException(`Ukuran file melebihi batas 100MB.`);
      }

      const result = await this.storage.upload({
        filename: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      }, 'materials');

      const material = await this.prisma.material.create({
        data: {
          filename: result.storageKey,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          extension: extWithoutDot,
          fileSize: file.size,
          storageProvider: result.storageProvider,
          storageKey: result.storageKey,
          publicUrl: result.publicUrl,
          uploadedBy: userId,
        },
      });

      this.logger.log(`File uploaded: ${material.id} via ${result.storageProvider} by user ${userId}`);
      return material;
    } catch (error) {
      this.logger.error('File upload failed', error);
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async getMaterial(id: string) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Material not found');
    return material;
  }

  async remove(id: string, userId: string, role: string) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Material not found');

    const isOwner = material.uploadedBy === userId;
    const isAdmin = role === 'SUPER_ADMIN' || role === 'REGIONAL_ADMIN';
    if (!isOwner && !isAdmin) {
      throw new NotFoundException('Material not found');
    }

    // Soft delete di DB, lalu hapus dari storage.
    await this.prisma.material.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    try {
      await this.storage.remove(material.storageKey, material.storageProvider as 'MINIO' | 'LOCAL');
    } catch (err) {
      this.logger.warn(`Gagal hapus file di storage: ${(err as Error).message}`);
    }
    return { success: true, id };
  }
}
