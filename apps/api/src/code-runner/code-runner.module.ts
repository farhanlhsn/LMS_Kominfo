import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import { PluginsModule } from "../plugins/plugins.module";
import { CodeRunnerController } from "./code-runner.controller";
import { CodeRunnerService } from "./code-runner.service";
import { Judge0SandboxProvider } from "./judge0-sandbox.provider";
import {
  MockSandboxProvider,
  SANDBOX_PROVIDER,
  type SandboxProvider,
} from "./sandbox.provider";

function createSandboxProvider(): SandboxProvider {
  const provider = (process.env.CODE_RUNNER_PROVIDER ?? "auto").toLowerCase();
  const judge0Url = process.env.JUDGE0_BASE_URL?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (provider === "judge0" || (provider === "auto" && judge0Url)) {
    return new Judge0SandboxProvider();
  }
  if (provider === "mock" || !isProd) {
    return new MockSandboxProvider();
  }
  // Production without Judge0: still bind a provider so DI works; service rejects mock name.
  return new MockSandboxProvider();
}

@Module({
  imports: [AuthModule, RbacModule, PluginsModule],
  providers: [
    PrismaService,
    CodeRunnerService,
    MockSandboxProvider,
    {
      provide: SANDBOX_PROVIDER,
      useFactory: createSandboxProvider,
    },
  ],
  controllers: [CodeRunnerController],
  exports: [CodeRunnerService],
})
export class CodeRunnerModule {}
