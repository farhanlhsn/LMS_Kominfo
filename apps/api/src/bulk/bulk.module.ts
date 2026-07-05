import { Module } from "@nestjs/common";
import { RealtimeModule } from "../realtime/realtime.module";
import { BulkOperationController } from "./bulk.controller";
import { BulkOperationService } from "./bulk.service";

@Module({
  imports: [RealtimeModule],
  controllers: [BulkOperationController],
  providers: [BulkOperationService],
  exports: [BulkOperationService],
})
export class BulkOperationModule {}
