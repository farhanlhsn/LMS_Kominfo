import { describe, expect, it, vi } from "vitest";
import { PluginExecutionLogger } from "./plugin-execution-logger.service";

describe("PluginExecutionLogger", () => {
  it("writes execution logs", async () => {
    const prisma = {
      pluginExecutionLog: {
        create: vi.fn().mockResolvedValue({ id: "log-1" }),
      },
    };
    const logger = new PluginExecutionLogger(prisma as any);
    await expect(
      logger.log({
        organizationId: "org",
        pluginId: "p1",
        action: "run",
        status: "SUCCESS",
        input: { x: 1 },
        output: { y: 2 },
        durationMs: 12,
      }),
    ).resolves.toEqual({ id: "log-1" });
    expect(prisma.pluginExecutionLog.create).toHaveBeenCalled();
  });
});
