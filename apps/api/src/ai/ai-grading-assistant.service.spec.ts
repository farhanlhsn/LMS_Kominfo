import { createAiConfig } from "@lms/config";
import { describe, expect, it, vi } from "vitest";
import { AiGradingAssistantService } from "./ai-grading-assistant.service";

describe("AiGradingAssistantService", () => {
  it("stores reviewable suggestion without applying final grade", async () => {
    const prisma = {
      quizAnswer: {
        findFirst: vi.fn().mockResolvedValue({
          id: "answer-1",
          organizationId: "org-a",
          textAnswer: "TCP reliable and ordered, UDP lower latency.",
          maxPoints: 10,
          metadata: {},
          question: {
            type: "ESSAY",
            prompt: "Compare TCP and UDP",
            points: 10,
            acceptedAnswers: ["TCP is reliable; UDP favors low latency"],
          },
          attempt: {
            quiz: { id: "quiz-1", courseId: "course-1", title: "Networking" },
          },
        }),
        update: vi.fn().mockResolvedValue({ id: "answer-1" }),
      },
      courseInstructor: { findFirst: vi.fn() },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const provider = {
      capabilities: { providerName: "mock", model: "mock-chat" },
      generateText: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          pointsAwarded: 8,
          confidence: 0.82,
          feedback: "Good comparison.",
          rationale: "Both protocol tradeoffs are identified.",
        }),
      }),
    };
    const service = new AiGradingAssistantService(
      prisma as any,
      { create: vi.fn().mockReturnValue(provider) } as any,
      {
        assertReady: vi.fn().mockResolvedValue(
          createAiConfig({
            AI_ENABLED: "true",
            AI_CHAT_PROVIDER: "mock",
            AI_EMBEDDING_PROVIDER: "mock",
          }),
        ),
      } as any,
    );

    const result = await service.suggest(
      {
        id: "org-a",
        name: "Org A",
        slug: "org-a",
        memberId: "member-1",
        roleKeys: ["instructor"],
        permissionKeys: ["quiz:grade"],
        isPlatformAdmin: false,
      },
      "instructor-1",
      "answer-1",
    );

    expect(result).toEqual(
      expect.objectContaining({
        pointsAwarded: 8,
        confidence: 0.82,
        reviewRequired: true,
      }),
    );
    expect(prisma.quizAnswer.update).toHaveBeenCalledWith({
      where: { id: "answer-1" },
      data: {
        metadata: expect.objectContaining({
          aiGradingSuggestion: expect.objectContaining({
            pointsAwarded: 8,
            reviewRequired: true,
          }),
        }),
      },
    });
  });
});
