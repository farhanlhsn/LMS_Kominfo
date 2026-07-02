import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { LessonsDirectController } from './lessons-direct.controller';
import { LessonsService } from './lessons.service';

@Module({
  controllers: [LessonsController, LessonsDirectController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
