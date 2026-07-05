import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import {
  AdminCohortController,
  LearnerCohortController,
  MeTimezoneController,
} from "./scheduling.controller";
import { SchedulingService } from "./scheduling.service";

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminCohortController,
    LearnerCohortController,
    MeTimezoneController,
  ],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
