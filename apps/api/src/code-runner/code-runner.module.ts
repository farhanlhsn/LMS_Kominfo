import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import { CodeRunnerController } from "./code-runner.controller";
import { CodeRunnerService } from "./code-runner.service";
import {
  MockSandboxProvider,
  SANDBOX_PROVIDER,
} from "./sandbox.provider";

@Module({
  imports: [AuthModule, RbacModule],
  providers: [
    PrismaService,
    CodeRunnerService,
    MockSandboxProvider,
    {
      provide: SANDBOX_PROVIDER,
      useExisting: MockSandboxProvider,
    },
  ],
  controllers: [CodeRunnerController],
  exports: [CodeRunnerService],
})
export class CodeRunnerModule {}
