import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MockProctoringProvider } from "./mock-proctoring.provider";
import {
  AdminProctoringController,
  ProctoringSessionController,
} from "./proctoring.controller";
import { PROCTORING_PROVIDER } from "./proctoring.provider";
import { ProctoringService } from "./proctoring.service";

@Module({
  imports: [PrismaModule],
  controllers: [ProctoringSessionController, AdminProctoringController],
  providers: [
    ProctoringService,
    { provide: PROCTORING_PROVIDER, useClass: MockProctoringProvider },
  ],
  exports: [ProctoringService],
})
export class ProctoringModule {}
