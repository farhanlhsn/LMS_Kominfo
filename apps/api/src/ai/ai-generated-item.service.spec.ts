import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { createAiConfig } from "@lms/config";
import { AiGeneratedItemService } from "./ai-generated-item.service";

function setup(overrides: Record<string, string> = {}) {
  const config = createAiConfig({ AI_ENABLED: "true", ...overrides });
  const prisma = {
    activity: {
      findFirst: vi.fn().mockResolvedValue({
        id: "activity-1",
        title: "Advanced Video",
        courseId: "course-1",
        lessonId: "lesson-1",
        activityTypeKey: "core.video",
      }),
    },
    courseInstructor: {
      findFirst: vi.fn().mockResolvedValue({ id: "inst-1" }),
      findMany: vi.fn().mockResolvedValue([{ courseId: "course-1" }]),
    },
    transcriptSegment: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "seg-1",
          startSeconds: 1,
          endSeconds: 4,
          text: "This lesson introduces transcript-driven learning.",
          language: "en",
        },
        {
          id: "seg-2",
          startSeconds: 5,
          endSeconds: 8,
          text: "Captions and notes improve accessibility and review.",
          language: "en",
        },
      ]),
    },
    aiGeneratedItem: {
      findMany: vi.fn().mockResolvedValue([{ id: "item-1" }]),
      findFirst: vi.fn().mockResolvedValue({
        id: "item-1",
        organizationId: "org-1",
        status: "DRAFT",
        metadata: {},
      }),
      create: vi.fn().mockImplementation(({ data }) => ({
        id: "item-1",
        ...data,
      })),
      update: vi.fn().mockImplementation(({ data }) => ({
        id: "item-1",
        ...data,
      })),
    },
    questionBank: {
      create: vi.fn().mockImplementation(({ data }) => ({
        id: "bank-ai-1",
        ...data,
      })),
    },
    question: {
      create: vi.fn().mockImplementation(({ data }) => ({
        id: "q-ai-1",
        ...data,
      })),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  const chatFactory = {
    create: vi.fn().mockReturnValue({
      capabilities: { providerName: "mock", model: "mock-chat" },
      generateText: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          title: "Quiz draft",
          instructions: "Review before publishing.",
          questions: [
            {
              prompt: "Apa fokus utama transcript?",
              type: "SHORT_ANSWER",
              suggestedAnswer: "Transcript-driven learning.",
              explanation: "Diambil dari cue pertama.",
              sourceTimestamp: 1,
            },
          ],
        }),
      }),
    }),
  };
  const service = new AiGeneratedItemService(
    config,
    prisma as never,
    chatFactory as never,
  );
  const organization = {
    id: "org-1",
    slug: "org",
    name: "Org",
    memberId: "m-1",
    roleKeys: ["instructor"],
    permissionKeys: ["courses:update", "courses:read"],
    isPlatformAdmin: false,
  };
  return { service, prisma, chatFactory, organization };
}

describe("AiGeneratedItemService", () => {
  it("creates a fallback summary draft when AI is disabled", async () => {
    const { service, prisma, chatFactory, organization } = setup({
      AI_ENABLED: "false",
    });

    const item = await service.generateVideoSummary(
      organization as never,
      "user-1",
      "activity-1",
      {},
    );

    expect(item.type).toBe("SUMMARY");
    expect(prisma.aiGeneratedItem.create).toHaveBeenCalled();
    expect(chatFactory.create).not.toHaveBeenCalled();
  });

  it("creates a quiz draft from provider JSON output", async () => {
    const { service, prisma, organization } = setup();

    const item = await service.generateVideoQuiz(
      organization as never,
      "user-1",
      "activity-1",
      { questionCount: 1 },
    );

    expect(item.type).toBe("QUIZ");
    expect(prisma.aiGeneratedItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DRAFT",
        }),
      }),
    );
  });

  it("falls back when quiz JSON has empty questions", async () => {
    const { service, chatFactory, organization } = setup();
    chatFactory.create.mockReturnValue({
      capabilities: { providerName: "mock", model: "mock-chat" },
      generateText: vi.fn().mockResolvedValue({
        text: JSON.stringify({ title: "T", instructions: "I", questions: [] }),
        inputTokens: 1,
        outputTokens: 1,
      }),
    });
    const item = await service.generateVideoQuiz(
      organization as never,
      "user-1",
      "activity-1",
      { questionCount: 2 },
    );
    expect(item.metadata).toMatchObject({ source: "fallback" });
  });

  it("lists items and walks approve/reject/publish lifecycle", async () => {
    const { service, prisma, organization } = setup();
    expect(
      await service.listForActivity(organization as never, "user-1", "activity-1"),
    ).toEqual([{ id: "item-1" }]);
    expect(
      await service.listForOrganization(organization as never, "user-1", {
        status: "DRAFT",
      }),
    ).toEqual([{ id: "item-1" }]);

    const limitedOrg = {
      ...organization,
      permissionKeys: [],
      isPlatformAdmin: false,
    };
    expect(
      await service.listForOrganization(limitedOrg as never, "user-1"),
    ).toEqual([{ id: "item-1" }]);
    prisma.courseInstructor.findMany.mockResolvedValueOnce([]);
    await expect(
      service.listForOrganization(limitedOrg as never, "user-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(await service.getItem("org-1", "item-1")).toMatchObject({
      id: "item-1",
    });
    prisma.aiGeneratedItem.findFirst.mockResolvedValueOnce(null);
    await expect(service.getItem("org-1", "missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.aiGeneratedItem.findFirst.mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "DRAFT",
      metadata: {},
    });
    await service.updateItemContent("org-1", "item-1", {
      title: "T",
      prompt: "P",
    });
    prisma.aiGeneratedItem.findFirst.mockResolvedValueOnce({
      id: "item-1",
      status: "PUBLISHED",
      metadata: {},
    });
    await expect(
      service.updateItemContent("org-1", "item-1", { title: "X" }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.aiGeneratedItem.findFirst.mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "DRAFT",
      metadata: {},
    });
    await expect(
      service.approveItem(organization as never, "user-1", "item-1"),
    ).resolves.toMatchObject({ status: "APPROVED" });
    await expect(
      service.rejectItem(organization as never, "user-1", "item-1", "nope"),
    ).resolves.toMatchObject({ status: "REJECTED" });

    prisma.aiGeneratedItem.findFirst.mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "APPROVED",
      metadata: {},
    });
    await expect(
      service.publishItem(organization as never, "user-1", "item-1"),
    ).resolves.toMatchObject({ status: "PUBLISHED" });

    prisma.aiGeneratedItem.findFirst.mockResolvedValueOnce({
      id: "item-1",
      status: "DRAFT",
      metadata: {},
    });
    await expect(
      service.publishItem(organization as never, "user-1", "item-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("falls back when provider returns non-json quiz text", async () => {
    const { service, chatFactory, organization } = setup();
    chatFactory.create.mockReturnValue({
      capabilities: { providerName: "mock", model: "mock-chat" },
      generateText: vi.fn().mockResolvedValue({
        text: "not-json",
        inputTokens: 1,
        outputTokens: 1,
      }),
    });
    const item = await service.generateVideoQuiz(
      organization as never,
      "user-1",
      "activity-1",
      { questionCount: 2 },
    );
    expect(item.type).toBe("QUIZ");
    expect(item.metadata).toMatchObject({ source: "fallback" });
  });

  it("publishes QUIZ draft into a question bank", async () => {
    const { service, prisma, organization } = setup();
    prisma.aiGeneratedItem.findFirst.mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      type: "QUIZ",
      title: "Video quiz",
      courseId: "course-1",
      status: "APPROVED",
      metadata: {},
      output: {
        title: "Video quiz",
        instructions: "Review me",
        questions: [
          {
            prompt: "What is the topic?",
            suggestedAnswer: "Learning",
            explanation: "From transcript",
            sourceTimestamp: 1,
          },
        ],
      },
    });
    await expect(
      service.publishItem(organization as never, "user-1", "item-1"),
    ).resolves.toMatchObject({ status: "PUBLISHED" });
    expect(prisma.questionBank.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: "user-1",
          title: "Video quiz (AI)",
        }),
      }),
    );
    expect(prisma.question.create).toHaveBeenCalled();
  });

  it("returns already approved/published items without re-update", async () => {
    const { service, prisma, organization } = setup();
    prisma.aiGeneratedItem.findFirst.mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "APPROVED",
      metadata: {},
    });
    await expect(
      service.approveItem(organization as never, "user-1", "item-1"),
    ).resolves.toMatchObject({ status: "APPROVED" });

    prisma.aiGeneratedItem.findFirst.mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "PUBLISHED",
      metadata: {},
    });
    await expect(
      service.publishItem(organization as never, "user-1", "item-1"),
    ).resolves.toMatchObject({ status: "PUBLISHED" });
    await expect(
      service.rejectItem(organization as never, "user-1", "item-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects non-video activities and falls back on provider failure", async () => {
    const { service, prisma, chatFactory, organization } = setup();
    prisma.activity.findFirst.mockResolvedValueOnce({
      id: "activity-1",
      title: "Text",
      courseId: "course-1",
      lessonId: "lesson-1",
      activityTypeKey: "core.text",
    });
    await expect(
      service.generateVideoSummary(organization as never, "user-1", "activity-1", {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    chatFactory.create.mockReturnValue({
      capabilities: { providerName: "mock", model: "mock-chat" },
      generateText: vi.fn().mockRejectedValue(new Error("down")),
    });
    const summary = await service.generateVideoSummary(
      organization as never,
      "user-1",
      "activity-1",
      {},
    );
    expect(summary.type).toBe("SUMMARY");
  });

  it("rejects missing transcript and insufficient permissions", async () => {
    const { service, prisma, organization } = setup();
    prisma.transcriptSegment.findMany.mockResolvedValueOnce([]);
    await expect(
      service.generateVideoSummary(organization as never, "user-1", "activity-1", {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    const limited = {
      ...organization,
      permissionKeys: [],
      isPlatformAdmin: false,
    };
    prisma.courseInstructor.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.listForActivity(limited as never, "user-1", "activity-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
