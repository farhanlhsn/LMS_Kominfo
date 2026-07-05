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
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(({ data }) => ({
        id: "item-1",
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
});
