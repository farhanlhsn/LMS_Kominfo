import { Module } from "@nestjs/common";
import { OpenApiController } from "../common/openapi/openapi.controller";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  controllers: [HealthController, OpenApiController],
  providers: [HealthService],
})
export class HealthModule {}
