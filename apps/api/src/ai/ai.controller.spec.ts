import { BadGatewayException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { Observable } from "rxjs";
import {
  AiController,
  AdminAiProviderController,
  InstructorActivityAiController,
  InstructorAiController,
  InstructorAiItemsController,
  LearnerAiController,
} from "./ai.controller";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["learner"],
  permissionKeys: [],
  isPlatformAdmin: false,
};
const user = {
  id: "u-1",
  email: "u@e.c",
  name: "T",
  sessionId: "s-1",
  role: "learner",
  isPlatformAdmin: false,
  activeOrganizationId: "org-a",
};

describe("AiController", () => {
  function setup(overrides: Record<string, any> = {}) {
    const statusService = {
      getStatus: vi
        .fn()
        .mockResolvedValue({ enabled: true, chatProvider: "mock" }),
      ...overrides,
    };
    return {
      controller: new AiController(statusService as any),
      statusService,
    };
  }

  it("returns AI status for the organization", async () => {
    const { controller, statusService } = setup();
    const response = await controller.getStatus(org);
    expect(statusService.getStatus).toHaveBeenCalledWith("org-a");
    expect(response).toEqual({ enabled: true, chatProvider: "mock" });
  });
});

describe("AdminAiProviderController", () => {
  function setup(options?: { chatError?: Error }) {
    const config = { enabled: true };
    const generateText = options?.chatError
      ? vi.fn().mockRejectedValue(options.chatError)
      : vi.fn().mockResolvedValue({ text: "OK" });
    const embedText = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    const runtime = {
      assertReady: vi.fn().mockResolvedValue(config),
    };
    const chatFactory = {
      create: vi.fn().mockReturnValue({
        capabilities: {
          providerName: "gemini_openai_compatible",
          model: "gemini-2.5-flash",
        },
        generateText,
      }),
    };
    const embeddingFactory = {
      create: vi.fn().mockReturnValue({
        capabilities: {
          providerName: "transformers_js",
          model: "local-embedding",
        },
        embedText,
      }),
    };
    return {
      controller: new AdminAiProviderController(
        runtime as never,
        chatFactory as never,
        embeddingFactory as never,
      ),
      generateText,
    };
  }

  it("allows enough output tokens for thinking-model connection tests", async () => {
    const { controller, generateText } = setup();

    await expect(controller.test(org as never)).resolves.toMatchObject({
      ok: true,
      chatModel: "gemini-2.5-flash",
      embeddingDimensions: 3,
    });
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ maxOutputTokens: 256 }),
    );
  });

  it("returns a useful gateway error when provider testing fails", async () => {
    const { controller } = setup({
      chatError: new Error("AI provider returned an empty chat response"),
    });

    await expect(controller.test(org as never)).rejects.toEqual(
      expect.objectContaining({
        constructor: BadGatewayException,
        message:
          "AI provider connection failed: AI provider returned an empty chat response",
      }),
    );
  });
});

describe("LearnerAiController", () => {
  function setup(overrides: Record<string, any> = {}) {
    const tutorService = {
      ask: vi.fn().mockResolvedValue({ answer: "hi", conversationId: "c-1" }),
      streamAsk: vi.fn(),
      submitFeedback: vi.fn().mockResolvedValue({ success: true }),
      ...overrides,
    };
    return {
      controller: new LearnerAiController(tutorService as any),
      tutorService,
    };
  }

  it("asks the AI tutor and returns the result", async () => {
    const { controller, tutorService } = setup();
    const response = await controller.askTutor(org, user, {
      question: "hi",
    } as any);
    expect(tutorService.ask).toHaveBeenCalledWith(
      "org-a",
      "u-1",
      expect.objectContaining({ question: "hi" }),
    );
    expect(response).toEqual({ answer: "hi", conversationId: "c-1" });
  });

  it("submits feedback for a message", async () => {
    const { controller, tutorService } = setup();
    const response = await controller.submitFeedback(
      org,
      user,
      "msg-1",
      "LIKE",
    );
    expect(tutorService.submitFeedback).toHaveBeenCalledWith(
      "org-a",
      "u-1",
      "msg-1",
      "LIKE",
    );
    expect(response).toEqual({ success: true });
  });

  it("streams tutor responses and subscribes to the observable", () => {
    const { controller, tutorService } = setup();
    const events: string[] = [];
    const res = {
      setHeader: vi.fn(),
      write: vi.fn((chunk: string) => {
        events.push(chunk);
        return true;
      }),
      end: vi.fn(),
    } as any;
    const req = { on: vi.fn() } as any;

    const stream = new Observable<{ data: any }>((subscriber) => {
      subscriber.next({ data: { type: "chunk", text: "hello " } });
      subscriber.next({ data: { type: "chunk", text: "world" } });
      subscriber.next({
        data: { type: "done", result: { conversationId: "c-1" } },
      });
      subscriber.complete();
    });
    tutorService.streamAsk.mockReturnValue(stream);

    controller.streamTutor(org, user, { question: "hi" } as any, req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/event-stream",
    );
    expect(tutorService.streamAsk).toHaveBeenCalledWith(
      "org-a",
      "u-1",
      expect.objectContaining({ question: "hi" }),
    );
    expect(events.join("")).toContain("data: ");
    expect(events.join("")).toContain("[DONE]");
    expect(req.on).toHaveBeenCalledWith("close", expect.any(Function));
  });

  it("writes an error SSE frame and ends the response on stream error", () => {
    const { controller, tutorService } = setup();
    const res = {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as any;
    const req = { on: vi.fn() } as any;

    const stream = new Observable<{ data: any }>((subscriber) => {
      subscriber.error(new Error("provider down"));
    });
    tutorService.streamAsk.mockReturnValue(stream);

    controller.streamTutor(org, user, { question: "hi" } as any, req, res);

    expect(res.write).toHaveBeenCalledWith(
      expect.stringContaining('"type":"error"'),
    );
    expect(res.end).toHaveBeenCalled();
  });
});

describe("InstructorAiController", () => {
  function setup(overrides: Record<string, any> = {}) {
    const indexingService = {
      requestCourseReindex: vi.fn().mockResolvedValue({
        queued: true,
        courseId: "c-1",
        deduplicated: false,
      }),
      assertCourseReady: vi.fn().mockResolvedValue({ ready: true }),
      courseStatus: vi.fn().mockResolvedValue({
        courseId: "c-1",
        documents: 5,
        chunks: 12,
        statuses: { READY: 5 },
      }),
      ...overrides,
    };
    const generatedItems = {
      generateCourseQuestions: vi.fn().mockResolvedValue({ id: "draft-1" }),
    };
    return {
      controller: new InstructorAiController(
        indexingService as any,
        generatedItems as any,
      ),
      indexingService,
      generatedItems,
    };
  }

  it("triggers indexing for a course", async () => {
    const { controller, indexingService } = setup();
    const response = await controller.index(org, user, "c-1");
    expect(indexingService.requestCourseReindex).toHaveBeenCalledWith(
      org,
      "u-1",
      "c-1",
    );
    expect(response).toEqual({
      queued: true,
      courseId: "c-1",
      deduplicated: false,
    });
  });

  it("returns the indexing status for a course", async () => {
    const { controller, indexingService } = setup();
    const response = await controller.status(org, user, "c-1");
    expect(indexingService.courseStatus).toHaveBeenCalledWith(
      org,
      "u-1",
      "c-1",
    );
    expect(response).toEqual({
      courseId: "c-1",
      documents: 5,
      chunks: 12,
      statuses: { READY: 5 },
    });
  });

  it("checks index readiness before generating course questions", async () => {
    const { controller, indexingService, generatedItems } = setup();
    await controller.generateQuestions(org, user, "c-1", {
      scope: "COURSE",
    });
    expect(indexingService.assertCourseReady).toHaveBeenCalledWith(
      org,
      "u-1",
      "c-1",
    );
    expect(generatedItems.generateCourseQuestions).toHaveBeenCalled();
  });
});

describe("InstructorActivityAiController", () => {
  function setup(overrides: Record<string, any> = {}) {
    const generatedItems = {
      listForActivity: vi.fn().mockResolvedValue([{ id: "item-1" }]),
      generateVideoSummary: vi
        .fn()
        .mockResolvedValue({ id: "item-1", type: "SUMMARY" }),
      generateVideoQuiz: vi
        .fn()
        .mockResolvedValue({ id: "item-2", type: "QUIZ" }),
      ...overrides,
    };
    return {
      controller: new InstructorActivityAiController(generatedItems as any),
      generatedItems,
    };
  }

  it("lists generated items for an activity", async () => {
    const { controller, generatedItems } = setup();
    const response = await controller.listGeneratedItems(
      org,
      user,
      "activity-1",
    );
    expect(generatedItems.listForActivity).toHaveBeenCalledWith(
      org,
      "u-1",
      "activity-1",
    );
    expect(response).toEqual([{ id: "item-1" }]);
  });

  it("generates video summary and quiz drafts", async () => {
    const { controller, generatedItems } = setup();

    await controller.generateVideoSummary(org, user, "activity-1", {
      language: "en",
    } as any);
    expect(generatedItems.generateVideoSummary).toHaveBeenCalledWith(
      org,
      "u-1",
      "activity-1",
      expect.objectContaining({ language: "en" }),
    );

    await controller.generateVideoQuiz(org, user, "activity-1", {
      questionCount: 5,
    } as any);
    expect(generatedItems.generateVideoQuiz).toHaveBeenCalledWith(
      org,
      "u-1",
      "activity-1",
      expect.objectContaining({ questionCount: 5 }),
    );
  });
});

describe("InstructorAiItemsController", () => {
  function setup() {
    const generatedItems = {
      listForOrganization: vi.fn().mockResolvedValue([{ id: "item-1" }]),
      getItem: vi.fn().mockResolvedValue({ id: "item-1", status: "DRAFT" }),
      updateItemContent: vi
        .fn()
        .mockResolvedValue({ id: "item-1", title: "T" }),
      approveItem: vi
        .fn()
        .mockResolvedValue({ id: "item-1", status: "APPROVED" }),
      rejectItem: vi
        .fn()
        .mockResolvedValue({ id: "item-1", deleted: true }),
      publishItem: vi
        .fn()
        .mockResolvedValue({ id: "item-1", status: "PUBLISHED" }),
    };
    return {
      controller: new InstructorAiItemsController(generatedItems as any),
      generatedItems,
    };
  }

  it("lists gets updates and lifecycle-manages generated items", async () => {
    const { controller, generatedItems } = setup();
    await controller.list(org, user, { status: "DRAFT" } as any);
    await controller.get(org, "item-1");
    await controller.update(org, "item-1", { title: "T" } as any);
    await controller.approve(org, user, "item-1");
    await controller.reject(org, user, "item-1", "nope");
    await controller.publish(org, user, "item-1");
    expect(generatedItems.listForOrganization).toHaveBeenCalled();
    expect(generatedItems.publishItem).toHaveBeenCalledWith(
      org,
      "u-1",
      "item-1",
    );
  });
});
