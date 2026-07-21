import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PluginExecutionLogger {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async log(input: {
    organizationId: string;
    pluginId: string;
    userId?: string | null;
    action: string;
    status: "SUCCESS" | "FAILED";
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string | null;
    durationMs?: number | null;
  }) {
    return this.prisma.pluginExecutionLog.create({
      data: {
        organizationId: input.organizationId,
        pluginId: input.pluginId,
        userId: input.userId,
        action: input.action,
        status: input.status,
        input: (input.input ?? {}) as Prisma.InputJsonObject,
        output: (input.output ?? {}) as Prisma.InputJsonObject,
        error: input.error,
        durationMs: input.durationMs,
      },
    });
  }
}
