import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { GoalsController, StudySessionController } from "./goals.controller";
import { GoalsService } from "./goals.service";

@Module({
  imports: [PrismaModule],
  controllers: [GoalsController, StudySessionController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
