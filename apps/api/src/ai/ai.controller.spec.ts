import { describe, expect, it, vi } from "vitest";
import { Observable } from "rxjs";
import {
  AiController,
  InstructorAiController,
  LearnerAiController,
} from "./ai.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["learner"], permissionKeys: [], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "T", sessionId: "s-1", role: "learner", isPlatformAdmin: false, activeOrganizationId: "org-a" };

describe("AiController", () => {
  function setup(overrides: Record<string, any> = {}) {
    const statusService = {
      getStatus: vi.fn().mockResolvedValue({ enabled: true, chatProvider: "mock" }),
      ...overrides,
    };
    return { controller: new AiController(statusService as any), statusService };
  }

  it("returns AI status for the organization", async () => {
    const { controller, statusService } = setup();
    const response = await controller.getStatus(org);
    expect(statusService.getStatus).toHaveBeenCalledWith("org-a");
    expect(response).toEqual({ enabled: true, chatProvider: "mock" });
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
    return { controller: new LearnerAiController(tutorService as any), tutorService };
  }

  it("asks the AI tutor and returns the result", async () => {
    const { controller, tutorService } = setup();
    const response = await controller.askTutor(org, user, { question: "hi" } as any);
    expect(tutorService.ask).toHaveBeenCalledWith("org-a", "u-1", expect.objectContaining({ question: "hi" }));
    expect(response).toEqual({ answer: "hi", conversationId: "c-1" });
  });

  it("submits feedback for a message", async () => {
    const { controller, tutorService } = setup();
    const response = await controller.submitFeedback(org, user, "msg-1", "LIKE");
    expect(tutorService.submitFeedback).toHaveBeenCalledWith("org-a", "u-1", "msg-1", "LIKE");
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
      subscriber.next({ data: { type: "done", result: { conversationId: "c-1" } } });
      subscriber.complete();
    });
    tutorService.streamAsk.mockReturnValue(stream);

    controller.streamTutor(org, user, { question: "hi" } as any, req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
    expect(tutorService.streamAsk).toHaveBeenCalledWith("org-a", "u-1", expect.objectContaining({ question: "hi" }));
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

    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"type":"error"'));
    expect(res.end).toHaveBeenCalled();
  });
});

describe("InstructorAiController", () => {
  function setup(overrides: Record<string, any> = {}) {
    const indexingService = {
      indexCourse: vi.fn().mockResolvedValue({ courseId: "c-1", activities: 3, documents: 5, chunks: 12 }),
      courseStatus: vi.fn().mockResolvedValue({ courseId: "c-1", documents: 5, chunks: 12, statuses: { READY: 5 } }),
      ...overrides,
    };
    return { controller: new InstructorAiController(indexingService as any), indexingService };
  }

  it("triggers indexing for a course", async () => {
    const { controller, indexingService } = setup();
    const response = await controller.index(org, user, "c-1");
    expect(indexingService.indexCourse).toHaveBeenCalledWith(org, "u-1", "c-1");
    expect(response).toEqual({ courseId: "c-1", activities: 3, documents: 5, chunks: 12 });
  });

  it("returns the indexing status for a course", async () => {
    const { controller, indexingService } = setup();
    const response = await controller.status(org, user, "c-1");
    expect(indexingService.courseStatus).toHaveBeenCalledWith(org, "u-1", "c-1");
    expect(response).toEqual({ courseId: "c-1", documents: 5, chunks: 12, statuses: { READY: 5 } });
  });
});
