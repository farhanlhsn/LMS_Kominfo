import { afterEach, describe, expect, it, vi } from "vitest";

describe("PrismaService", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.SKIP_DATABASE_CONNECT;
  });

  it("skips connect when SKIP_DATABASE_CONNECT=true", async () => {
    process.env.SKIP_DATABASE_CONNECT = "true";
    vi.doMock("@lms/db", () => {
      class PrismaClient {
        $connect = vi.fn();
        $disconnect = vi.fn();
      }
      return { PrismaClient };
    });
    const { PrismaService } = await import("./prisma.service");
    const service = new PrismaService();
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(service.$connect).not.toHaveBeenCalled();
    expect(service.$disconnect).toHaveBeenCalled();
  });

  it("connects when database is not skipped", async () => {
    process.env.SKIP_DATABASE_CONNECT = "false";
    vi.doMock("@lms/db", () => {
      class PrismaClient {
        $connect = vi.fn().mockResolvedValue(undefined);
        $disconnect = vi.fn().mockResolvedValue(undefined);
      }
      return { PrismaClient };
    });
    const { PrismaService } = await import("./prisma.service");
    const service = new PrismaService();
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalled();
  });

  it("connects when skip flag is unset", async () => {
    delete process.env.SKIP_DATABASE_CONNECT;
    vi.doMock("@lms/db", () => {
      class PrismaClient {
        $connect = vi.fn().mockResolvedValue(undefined);
        $disconnect = vi.fn().mockResolvedValue(undefined);
      }
      return { PrismaClient };
    });
    const { PrismaService } = await import("./prisma.service");
    const service = new PrismaService();
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalled();
  });
});

