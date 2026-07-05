import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CalendarController, DiscussionsController, LiveClassesController, NotificationsController } from "./engagement.controller";
import { EngagementService } from "./engagement.service";
import { NotificationService } from "./notification.service";
import { LiveClassProviderService } from "./live-class-provider.service";

@Module({
  imports: [PrismaModule],
  controllers: [DiscussionsController, LiveClassesController, NotificationsController, CalendarController],
  providers: [EngagementService, NotificationService, LiveClassProviderService],
  exports: [NotificationService],
})
export class EngagementModule {}
