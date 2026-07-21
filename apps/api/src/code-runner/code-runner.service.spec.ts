import { describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CodeRunnerService } from "./code-runner.service";
import type { SandboxProvider, SandboxRunResult } from "./sandbox.provider";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["instructor"],
  permissionKeys: ["assignments:manage"],
  isPlatformAdmin: false,
};

function makeSandbox(result: SandboxRunResult): SandboxProvider {
  return {
    name: "mock",
    run: vi.fn().mockResolvedValue(result),
  };
}

function setup(opts: { sandbox: SandboxProvider; assignment?: Record<string, any> }) {
  const executions = new Map<string, Record<string, any>>();
  const submissions: Record<string, any>[] = [];
  const assignments = new Map<string, Record<string, any>>();
  if (opts.assignment) {
    assignments.set(opts.assignment.id, opts.assignment);
  }
  const testCases = new Map<string, Record<string, any>>();

  const prisma: any = {
    codeExecution: {
      create: vi.fn(async (args: any) => {
        const id = `exec-${executions.size + 1}`;
        const created: any = {
          id,
          organizationId: org.id,
          userId: args.data.userId,
          language: args.data.language,
          code: args.data.code,
          status: args.data.status,
          output: args.data.output ?? null,
          error: args.data.error ?? null,
          durationMs: args.data.durationMs ?? null,
          completedAt: args.data.completedAt ?? null,
        };
        if (args.data.testCases?.create) {
          const tcs: any[] = [];
          args.data.testCases.create.forEach((tc: any, idx: number) => {
            const tcid = `${id}-${idx}`;
            const stored = { id: tcid, executionId: id, ...tc };
            testCases.set(tcid, stored);
            tcs.push(stored);
          });
          created.testCases = tcs;
        }
        executions.set(id, created);
        return created;
      }),
      findFirst: vi.fn(async (args: any) => {
        const list = Array.from(executions.values());
        return (
          list.find(
            (e) =>
              e.organizationId === args?.where?.organizationId &&
              e.id === args.where.id,
          ) ?? null
        );
      }),
      update: vi.fn(async (args: any) => {
        const existing = executions.get(args.where.id);
        const updated = { ...existing, ...args.data };
        executions.set(args.where.id, updated);
        return updated;
      }),
    },
    codeExecutionTestCase: {
      updateMany: vi.fn(async (args: any) => {
        for (const [id, tc] of testCases.entries()) {
          if (tc.executionId === args.where.executionId) {
            testCases.set(id, { ...tc, ...args.data });
          }
        }
        return { count: 0 };
      }),
      update: vi.fn(async (args: any) => {
        const existing = testCases.get(args.where.id);
        const updated = { ...existing, ...args.data };
        testCases.set(args.where.id, updated);
        return updated;
      }),
    },
    codeSubmission: {
      create: vi.fn(async (args: any) => {
        const sub = { id: `sub-${submissions.length + 1}`, ...args.data };
        submissions.push(sub);
        return sub;
      }),
      findMany: vi.fn(async () => submissions),
    },
    assignment: {
      findFirst: vi.fn(async (args: any) => {
        const list = Array.from(assignments.values());
        return (
          list.find(
            (a) =>
              a.organizationId === args?.where?.organizationId &&
              a.id === args.where.id,
          ) ?? null
        );
      }),
    },
    $transaction: vi.fn(async (ops: any[]) => {
      const results: any[] = [];
      for (const op of ops) {
        if (op && typeof op.then === "function") {
          results.push(await op);
        } else if (typeof op === "function") {
          results.push(await op(prisma));
        } else {
          results.push(await op);
        }
      }
      return results;
    }),
  };

  return {
    service: new CodeRunnerService(prisma, opts.sandbox),
    prisma,
    executions,
    submissions,
  };
}

const baseSandboxResult: SandboxRunResult = {
  status: "COMPLETED",
  stdout: "hello world\n",
  stderr: "",
  durationMs: 12,
  exitCode: 0,
  signal: null,
  timedOut: false,
};

describe("CodeRunnerService", () => {
  it("executes user code in the sandbox and stores the result", async () => {
    const sandbox = makeSandbox(baseSandboxResult);
    const { service, prisma } = setup({ sandbox });
    const result = await service.execute(org, "u1", {
      language: "JAVASCRIPT",
      code: "console.log('hello world')",
    } as any);
    expect(sandbox.run).toHaveBeenCalled();
    expect(result.status).toBe("COMPLETED");
    expect(prisma.codeExecution.create).toHaveBeenCalled();
  });

  it("rejects empty code", async () => {
    const sandbox = makeSandbox(baseSandboxResult);
    const { service } = setup({ sandbox });
    await expect(
      service.execute(org, "u1", { language: "JAVASCRIPT", code: "  " } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps sandbox runtime errors to status", async () => {
    const sandbox = makeSandbox({
      ...baseSandboxResult,
      status: "RUNTIME_ERROR",
      exitCode: 1,
      stderr: "ReferenceError: x is not defined",
    });
    const { service } = setup({ sandbox });
    const result = await service.execute(org, "u1", {
      language: "JAVASCRIPT",
      code: "console.log(x)",
    } as any);
    expect(result.status).toBe("RUNTIME_ERROR");
  });

  it("throws when sandbox provider is missing", async () => {
    const prisma = {} as any;
    const service = new CodeRunnerService(prisma, undefined);
    await expect(
      service.execute(org, "u1", { language: "JAVASCRIPT", code: "x" } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns NotFound when execution is missing", async () => {
    const sandbox = makeSandbox(baseSandboxResult);
    const { service } = setup({ sandbox });
    await expect(service.getExecution("org-a", "missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("judges a submission against test cases", async () => {
    const sandbox: SandboxProvider = {
      name: "mock",
      run: vi.fn(async () => baseSandboxResult),
    };
    const { service } = setup({
      sandbox,
      assignment: { id: "a-1", organizationId: "org-a" },
    });
    const result = await service.judge(org, "u1", "a-1", {
      language: "JAVASCRIPT",
      code: "console.log('hello world')",
      testCases: [
        { name: "T1", expectedOutput: "hello world" },
        { name: "T2", expectedOutput: "different" },
      ],
    } as any);
    expect(result.results).toHaveLength(2);
    expect(result.score).toBe(50);
  });

  it("throws when grading an unknown assignment", async () => {
    const sandbox = makeSandbox(baseSandboxResult);
    const { service } = setup({ sandbox });
    await expect(
      service.judge(org, "u1", "missing", {
        language: "JAVASCRIPT",
        code: "x",
        testCases: [{ name: "T1", expectedOutput: "x" }],
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lists submissions with optional filters", async () => {
    const sandbox = makeSandbox(baseSandboxResult);
    const { service, prisma } = setup({ sandbox });
    await service.listSubmissions("org-a", { assignmentId: "a-1" });
    expect(prisma.codeSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assignmentId: "a-1" }),
      }),
    );
  });
});
