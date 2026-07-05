import { describe, expect, it, vi } from "vitest";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { LearningWorkspaceController, InstructorTranscriptController } from "./learning-workspace.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["learner"], permissionKeys: [], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "learner", isPlatformAdmin: false, activeOrganizationId: "org-a" };
const instructorOrg = { ...org, roleKeys: ["instructor"], permissionKeys: ["courses:update", "courses:read"] };
const instructorUser = { ...user, role: "instructor" };

function setup(overrides: Record<string, any> = {}) {
  const workspace = {
    getPreferences: vi.fn().mockResolvedValue({ id: "pref-1", preferredLayout: "standard" }),
    updatePreferences: vi.fn().mockResolvedValue({ id: "pref-1", sidebarCollapsed: true }),
    getState: vi.fn().mockResolvedValue({ id: "state-1", layout: "standard" }),
    updateState: vi.fn().mockResolvedValue({ id: "state-1", layout: "focus" }),
    listNotes: vi.fn().mockResolvedValue([{ id: "note-1" }]),
    createNote: vi.fn().mockResolvedValue({ id: "note-1" }),
    updateNote: vi.fn().mockResolvedValue({ id: "note-1", content: "edited" }),
    deleteNote: vi.fn().mockResolvedValue({ id: "note-1", deletedAt: new Date() }),
    listBookmarks: vi.fn().mockResolvedValue([{ id: "bm-1" }]),
    createBookmark: vi.fn().mockResolvedValue({ id: "bm-1" }),
    updateBookmark: vi.fn().mockResolvedValue({ id: "bm-1", title: "updated" }),
    deleteBookmark: vi.fn().mockResolvedValue({ id: "bm-1", deletedAt: new Date() }),
    getTranscript: vi.fn().mockResolvedValue([{ id: "seg-1" }]),
    getWorkspaceContext: vi.fn().mockResolvedValue({ id: "ctx-1", availablePanels: [] }),
    instructorTranscript: vi.fn().mockResolvedValue([{ id: "seg-1" }]),
    upsertInstructorTranscript: vi.fn().mockResolvedValue([{ id: "seg-1" }]),
    updateTranscriptSegment: vi.fn().mockResolvedValue({ id: "seg-1", text: "updated" }),
    deleteTranscriptSegment: vi.fn().mockResolvedValue({ id: "seg-1" }),
    ...overrides,
  };
  return { workspace };
}

describe("LearningWorkspaceController", () => {
  it("returns and updates the workspace preferences", async () => {
    const { workspace } = setup();
    const controller = new LearningWorkspaceController(workspace as any);

    await controller.preferences(org, user);
    expect(workspace.getPreferences).toHaveBeenCalledWith("org-a", "u-1");

    await controller.updatePreferences(org, user, { sidebarCollapsed: true } as any);
    expect(workspace.updatePreferences).toHaveBeenCalledWith("org-a", "u-1", expect.objectContaining({ sidebarCollapsed: true }));
  });

  it("returns and updates the workspace state", async () => {
    const { workspace } = setup();
    const controller = new LearningWorkspaceController(workspace as any);

    await controller.state(org, user, { courseId: "c-1" } as any);
    expect(workspace.getState).toHaveBeenCalledWith("org-a", "u-1", expect.objectContaining({ courseId: "c-1" }));

    await controller.updateState(org, user, { layout: "focus" } as any);
    expect(workspace.updateState).toHaveBeenCalledWith("org-a", "u-1", expect.objectContaining({ layout: "focus" }));
  });

  it("manages notes: list, create, update, delete", async () => {
    const { workspace } = setup();
    const controller = new LearningWorkspaceController(workspace as any);

    await controller.notes(org, user, { courseId: "c-1" } as any);
    expect(workspace.listNotes).toHaveBeenCalledWith("org-a", "u-1", expect.objectContaining({ courseId: "c-1" }));

    await controller.createNote(org, user, { content: "My note" } as any);
    expect(workspace.createNote).toHaveBeenCalledWith("org-a", "u-1", expect.objectContaining({ content: "My note" }));

    await controller.updateNote(org, user, "note-1", { content: "edited" } as any);
    expect(workspace.updateNote).toHaveBeenCalledWith("org-a", "u-1", "note-1", expect.objectContaining({ content: "edited" }));

    await controller.deleteNote(org, user, "note-1");
    expect(workspace.deleteNote).toHaveBeenCalledWith("org-a", "u-1", "note-1");
  });

  it("manages bookmarks: list, create, update, delete", async () => {
    const { workspace } = setup();
    const controller = new LearningWorkspaceController(workspace as any);

    await controller.bookmarks(org, user, { courseId: "c-1" } as any);
    expect(workspace.listBookmarks).toHaveBeenCalledWith("org-a", "u-1", expect.objectContaining({ courseId: "c-1" }));

    await controller.createBookmark(org, user, { title: "Bookmark" } as any);
    expect(workspace.createBookmark).toHaveBeenCalledWith("org-a", "u-1", expect.objectContaining({ title: "Bookmark" }));

    await controller.updateBookmark(org, user, "bm-1", { title: "updated" } as any);
    expect(workspace.updateBookmark).toHaveBeenCalledWith("org-a", "u-1", "bm-1", expect.objectContaining({ title: "updated" }));

    await controller.deleteBookmark(org, user, "bm-1");
    expect(workspace.deleteBookmark).toHaveBeenCalledWith("org-a", "u-1", "bm-1");
  });

  it("returns the transcript and workspace context for an activity", async () => {
    const { workspace } = setup();
    const controller = new LearningWorkspaceController(workspace as any);

    await controller.transcript(org, user, "a-1");
    expect(workspace.getTranscript).toHaveBeenCalledWith("org-a", "u-1", "a-1");

    await controller.context(org, user, "a-1");
    expect(workspace.getWorkspaceContext).toHaveBeenCalledWith("org-a", "u-1", "a-1");
  });

  it("propagates a not found error when the activity is missing", async () => {
    const { workspace } = setup({
      getTranscript: vi.fn().mockRejectedValue(new NotFoundException("Activity not found")),
    });
    const controller = new LearningWorkspaceController(workspace as any);
    await expect(controller.transcript(org, user, "missing")).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("InstructorTranscriptController", () => {
  it("returns the transcript, upserts, updates, and deletes segments", async () => {
    const { workspace } = setup();
    const controller = new InstructorTranscriptController(workspace as any);

    await controller.transcript(instructorOrg, instructorUser, "a-1");
    expect(workspace.instructorTranscript).toHaveBeenCalledWith(instructorOrg, "u-1", "a-1");

    await controller.upsertTranscript(instructorOrg, instructorUser, "a-1", { segments: [] } as any);
    expect(workspace.upsertInstructorTranscript).toHaveBeenCalledWith(instructorOrg, "u-1", "a-1", expect.objectContaining({ segments: [] }));

    await controller.updateSegment(instructorOrg, instructorUser, "seg-1", { text: "updated" } as any);
    expect(workspace.updateTranscriptSegment).toHaveBeenCalledWith(instructorOrg, "u-1", "seg-1", expect.objectContaining({ text: "updated" }));

    await controller.deleteSegment(instructorOrg, instructorUser, "seg-1");
    expect(workspace.deleteTranscriptSegment).toHaveBeenCalledWith(instructorOrg, "u-1", "seg-1");
  });

  it("propagates a forbidden exception when the user cannot manage the activity", async () => {
    const { workspace } = setup({
      upsertInstructorTranscript: vi.fn().mockRejectedValue(new ForbiddenException("Insufficient course permissions")),
    });
    const controller = new InstructorTranscriptController(workspace as any);
    await expect(
      controller.upsertTranscript(instructorOrg, instructorUser, "a-1", { segments: [] } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
