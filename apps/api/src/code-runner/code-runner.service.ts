import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import {
  SANDBOX_PROVIDER,
  type CodeLanguage,
  type SandboxProvider,
  type SandboxRunResult,
} from "./sandbox.provider";
import type {
  ExecuteCodeDto,
  JudgeCodeDto,
  TestCaseInput,
} from "./dto/code-runner.dto";

type NormalizedOutput = string;

function normalizeOutput(value: string): NormalizedOutput {
  return value.replace(/\r\n/g, "\n").trim();
}

@Injectable()
export class CodeRunnerService {
  // The Prisma client is cast to `any` to remain forward-compatible with the
  // regenerated prisma types for the new code-runner models.
  private readonly db: any;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional()
    @Inject(SANDBOX_PROVIDER)
    private readonly sandbox?: SandboxProvider,
  ) {
    this.db = prisma as unknown as any;
  }

  async execute(
    organization: OrganizationContext,
    userId: string,
    dto: ExecuteCodeDto,
  ) {
    if (!dto.code.trim()) {
      throw new BadRequestException("Code is required");
    }
    const result = await this.runSandbox(dto.language, dto.code, dto.stdin, dto.timeoutMs);
    const execution = await this.db.codeExecution.create({
      data: {
        organizationId: organization.id,
        userId,
        language: dto.language,
        code: dto.code,
        status: this.mapStatus(result),
        output: result.stdout || null,
        error: result.stderr || null,
        durationMs: result.durationMs,
        completedAt: new Date(),
      },
    });
    return { ...execution, sandboxStatus: result.status };
  }

  async getExecution(organizationId: string, id: string) {
    const execution = await this.db.codeExecution.findFirst({
      where: { id, organizationId },
      include: { testCases: true },
    });
    if (!execution) {
      throw new NotFoundException("Code execution not found");
    }
    return execution;
  }

  async judge(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
    dto: JudgeCodeDto,
  ) {
    if (!dto.testCases?.length) {
      throw new BadRequestException("At least one test case is required");
    }
    const assignment = await this.db.assignment.findFirst({
      where: { id: assignmentId, organizationId: organization.id },
    });
    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }

    const execution = await this.db.codeExecution.create({
      data: {
        organizationId: organization.id,
        userId,
        language: dto.language,
        code: dto.code,
        status: "RUNNING",
        testCases: {
          create: dto.testCases.map((t) => ({
            name: t.name,
            input: t.input ?? "",
            expectedOutput: t.expectedOutput,
          })),
        },
      },
      include: { testCases: true },
    });

    const graded = await this.gradeExecution(execution.testCases, dto, execution.id);
    const passed = graded.filter((g) => g.passed).length;
    const score = (passed / graded.length) * 100;
    const status: "PASSED" | "FAILED" = passed === graded.length ? "PASSED" : "FAILED";

    await this.db.$transaction([
      this.db.codeExecutionTestCase.updateMany({
        where: { executionId: execution.id },
        data: { passed: false },
      }),
      ...graded.map((g) =>
        this.db.codeExecutionTestCase.update({
          where: { id: g.id },
          data: { passed: g.passed, actualOutput: g.actualOutput },
        }),
      ),
      this.db.codeExecution.update({
        where: { id: execution.id },
        data: {
          status,
          completedAt: new Date(),
          durationMs: Math.max(...graded.map((g) => g.durationMs)),
        },
      }),
      this.db.codeSubmission.create({
        data: {
          organizationId: organization.id,
          assignmentId,
          userId,
          language: dto.language,
          code: dto.code,
          status,
          score,
          feedback: graded
            .map((g) => `${g.name}: ${g.passed ? "PASS" : "FAIL"}`)
            .join("\n"),
        },
      }),
    ]);

    return {
      executionId: execution.id,
      status,
      score,
      results: graded,
    };
  }

  async listSubmissions(
    organizationId: string,
    query: { assignmentId?: string; userId?: string },
  ) {
    return this.db.codeSubmission.findMany({
      where: {
        organizationId,
        ...(query.assignmentId ? { assignmentId: query.assignmentId } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  private async gradeExecution(
    existingTestCases: Array<{ id: string; name: string; input: string; expectedOutput: string }>,
    dto: JudgeCodeDto,
    executionId: string,
  ) {
    const results: Array<{
      id: string;
      name: string;
      passed: boolean;
      actualOutput: string;
      durationMs: number;
    }> = [];
    for (let i = 0; i < dto.testCases.length; i++) {
      const tc = dto.testCases[i] as TestCaseInput;
      const persisted = existingTestCases[i] ?? { id: `${executionId}-${i}` };
      const result = await this.runSandbox(
        dto.language,
        dto.code,
        tc.input,
        dto.timeoutMs,
      );
      const expected = normalizeOutput(tc.expectedOutput);
      const actual = normalizeOutput(result.stdout);
      results.push({
        id: persisted.id,
        name: tc.name,
        passed: actual === expected,
        actualOutput: result.stdout,
        durationMs: result.durationMs,
      });
    }
    return results;
  }

  private async runSandbox(
    language: CodeLanguage,
    code: string,
    stdin?: string,
    timeoutMs?: number,
  ): Promise<SandboxRunResult> {
    if (!this.sandbox) {
      throw new BadRequestException("Sandbox provider not configured");
    }
    return this.sandbox.run({ language, code, stdin, timeoutMs });
  }

  private mapStatus(result: SandboxRunResult): string {
    if (result.timedOut) return "TIMED_OUT";
    if (result.status === "COMPLETED") return "COMPLETED";
    if (result.status === "RUNTIME_ERROR") return "RUNTIME_ERROR";
    if (result.status === "ERROR") return "ERROR";
    return "FAILED";
  }
}

// Re-export to keep `Prisma` reference available without bundling it in unused.
export type CodeRunnerPrismaInputJson = Prisma.InputJsonValue;
