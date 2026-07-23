import { createAiConfig } from "@lms/config";
import { describe, expect, it, vi } from "vitest";
import { AiGeneratedItemService } from "./ai-generated-item.service";

describe("AI course question generation", () => {
  it("creates organization-scoped review draft from indexed chunks", async () => {
    const prisma = {
      course: {
        findFirst: vi.fn().mockResolvedValue({
          id: "course-1",
          title: "Networking",
        }),
      },
      courseInstructor: { findFirst: vi.fn() },
      aiDocumentChunk: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { content: "TCP provides ordered reliable delivery." },
          ]),
      },
      aiGeneratedItem: {
        create: vi.fn(async ({ data }: any) => ({
          id: "item-1",
          ...data,
        })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const config = createAiConfig({
      AI_ENABLED: "true",
      AI_CHAT_PROVIDER: "mock",
      AI_EMBEDDING_PROVIDER: "mock",
    });
    const service = new AiGeneratedItemService(
      config,
      prisma as any,
      {
        create: vi.fn().mockReturnValue({
          capabilities: { providerName: "mock", model: "mock-chat" },
          generateText: vi.fn().mockResolvedValue({
            text: JSON.stringify({
              title: "TCP review",
              instructions: "Answer briefly.",
              questions: [
                {
                  prompt: "Why does TCP preserve order?",
                  type: "SHORT_ANSWER",
                  suggestedAnswer: "It sequences and acknowledges segments.",
                  explanation: "Sequence numbers restore ordering.",
                  sourceTimestamp: 0,
                },
              ],
            }),
          }),
        }),
      } as any,
      { assertReady: vi.fn().mockResolvedValue(config) } as any,
    );

    const result = await service.generateCourseQuestions(
      {
        id: "org-a",
        name: "Org A",
        slug: "org-a",
        memberId: "member-1",
        roleKeys: ["instructor"],
        permissionKeys: ["courses:update"],
        isPlatformAdmin: false,
      },
      "instructor-1",
      "course-1",
      { questionCount: 5, difficulty: "medium" },
    );

    expect(result).toEqual(
      expect.objectContaining({
        organizationId: "org-a",
        courseId: "course-1",
        status: "DRAFT",
        type: "QUIZ",
      }),
    );
    expect(prisma.aiDocumentChunk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-a",
          courseId: "course-1",
        }),
      }),
    );
  });

  it("hard-filters module, lesson, activity, and selected material scopes", async () => {
    const prisma = {
      course: {
        findFirst: vi.fn().mockResolvedValue({
          id: "course-1",
          title: "Networking",
        }),
      },
      courseModule: {
        findFirst: vi.fn().mockResolvedValue({
          title: "Transport",
          lessons: [{ id: "lesson-1" }, { id: "lesson-2" }],
        }),
      },
      lesson: {
        findFirst: vi.fn().mockResolvedValue({
          id: "lesson-1",
          title: "TCP",
        }),
      },
      activity: {
        findFirst: vi.fn().mockResolvedValue({
          id: "activity-1",
          lessonId: "lesson-1",
          title: "TCP handshake",
        }),
      },
      aiDocument: {
        findMany: vi.fn().mockResolvedValue([
          { id: "document-1", title: "TCP notes" },
        ]),
      },
      courseInstructor: { findFirst: vi.fn() },
      aiDocumentChunk: {
        findMany: vi.fn().mockResolvedValue([
          {
            content: "TCP uses a three-way handshake.",
            sourceDocument: {
              title: "TCP notes",
              sourceType: "ACTIVITY_CONTENT",
            },
          },
        ]),
      },
      aiGeneratedItem: {
        create: vi.fn(async ({ data }: any) => ({
          id: "item-1",
          ...data,
        })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const config = createAiConfig({
      AI_ENABLED: "true",
      AI_CHAT_PROVIDER: "mock",
      AI_EMBEDDING_PROVIDER: "mock",
    });
    const service = new AiGeneratedItemService(
      config,
      prisma as any,
      {
        create: vi.fn().mockReturnValue({
          capabilities: { providerName: "mock", model: "mock-chat" },
          generateText: vi.fn().mockResolvedValue({
            text: JSON.stringify({
              title: "TCP review",
              instructions: "Answer briefly.",
              questions: [
                {
                  prompt: "What starts a TCP connection?",
                  type: "SHORT_ANSWER",
                  suggestedAnswer: "A three-way handshake.",
                  explanation: "It synchronizes sequence numbers.",
                },
              ],
            }),
          }),
        }),
      } as any,
      { assertReady: vi.fn().mockResolvedValue(config) } as any,
    );
    const organization = {
      id: "org-a",
      name: "Org A",
      slug: "org-a",
      memberId: "member-1",
      roleKeys: ["instructor"],
      permissionKeys: ["courses:update"],
      isPlatformAdmin: false,
    };

    await service.generateCourseQuestions(
      organization,
      "instructor-1",
      "course-1",
      { scope: "MODULE", moduleId: "module-1" },
    );
    await service.generateCourseQuestions(
      organization,
      "instructor-1",
      "course-1",
      { scope: "LESSON", lessonId: "lesson-1" },
    );
    await service.generateCourseQuestions(
      organization,
      "instructor-1",
      "course-1",
      { scope: "ACTIVITY", activityId: "activity-1" },
    );
    const documentResult = await service.generateCourseQuestions(
      organization,
      "instructor-1",
      "course-1",
      { scope: "DOCUMENTS", sourceDocumentIds: ["document-1"] },
    );

    expect(prisma.aiDocumentChunk.findMany.mock.calls[0]?.[0].where).toEqual(
      expect.objectContaining({
        organizationId: "org-a",
        courseId: "course-1",
        lessonId: { in: ["lesson-1", "lesson-2"] },
      }),
    );
    expect(prisma.aiDocumentChunk.findMany.mock.calls[1]?.[0].where).toEqual(
      expect.objectContaining({ lessonId: "lesson-1" }),
    );
    expect(prisma.aiDocumentChunk.findMany.mock.calls[2]?.[0].where).toEqual(
      expect.objectContaining({ activityId: "activity-1" }),
    );
    expect(prisma.aiDocumentChunk.findMany.mock.calls[3]?.[0].where).toEqual(
      expect.objectContaining({
        sourceDocumentId: { in: ["document-1"] },
      }),
    );
    expect(documentResult.metadata).toEqual(
      expect.objectContaining({
        scope: "DOCUMENTS",
        sourceDocumentIds: ["document-1"],
      }),
    );
  });

  it("does not invent video timestamps for material fallback", async () => {
    const prisma = {
      course: {
        findFirst: vi.fn().mockResolvedValue({
          id: "course-1",
          title: "Networking",
        }),
      },
      activity: {
        findFirst: vi.fn().mockResolvedValue({
          id: "activity-1",
          lessonId: "lesson-1",
          title: "TCP notes",
        }),
      },
      courseInstructor: { findFirst: vi.fn() },
      aiDocumentChunk: {
        findMany: vi.fn().mockResolvedValue([
          {
            content: "TCP establishes a connection using SYN and ACK.",
            sourceDocument: {
              title: "TCP notes",
              sourceType: "ACTIVITY_CONTENT",
            },
          },
        ]),
      },
      aiGeneratedItem: {
        create: vi.fn(async ({ data }: any) => ({
          id: "item-1",
          ...data,
        })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const config = createAiConfig({
      AI_ENABLED: "true",
      AI_CHAT_PROVIDER: "mock",
      AI_EMBEDDING_PROVIDER: "mock",
    });
    const service = new AiGeneratedItemService(
      config,
      prisma as any,
      {
        create: vi.fn().mockReturnValue({
          capabilities: { providerName: "mock", model: "mock-chat" },
          generateText: vi.fn().mockResolvedValue({ text: "not-json" }),
        }),
      } as any,
      { assertReady: vi.fn().mockResolvedValue(config) } as any,
    );

    const result = await service.generateCourseQuestions(
      {
        id: "org-a",
        name: "Org A",
        slug: "org-a",
        memberId: "member-1",
        roleKeys: ["instructor"],
        permissionKeys: ["courses:update"],
        isPlatformAdmin: false,
      },
      "instructor-1",
      "course-1",
      { scope: "ACTIVITY", activityId: "activity-1" },
    );
    const questions = (
      result.output as { questions: Array<Record<string, unknown>> }
    ).questions;

    expect(questions[0]?.prompt).toContain("TCP establishes a connection");
    expect(questions[0]?.prompt).not.toContain("00:");
    expect(questions[0]).not.toHaveProperty("sourceTimestamp");
  });
});
