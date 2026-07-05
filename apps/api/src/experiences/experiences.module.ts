import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import {
  CourseFeedbackController,
  H5PController,
  H5PResultController,
  PollController,
  ScormAttemptController,
  ScormController,
  SurveyController,
  XapiController,
} from "./experiences.controller";
import { ExperiencesService } from "./experiences.service";

@Module({
  imports: [PrismaModule],
  controllers: [
    ScormController,
    ScormAttemptController,
    H5PController,
    H5PResultController,
    XapiController,
    SurveyController,
    PollController,
    CourseFeedbackController,
  ],
  providers: [ExperiencesService],
  exports: [ExperiencesService],
})
export class ExperiencesModule {}
