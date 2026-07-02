import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  // PrismaService, CacheService, StorageService sudah global via PrismaModule
  // dan StorageModule/CacheModule (keduanya @Global()).
})
export class HealthModule {}
