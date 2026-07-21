import { describe, expect, it, vi } from "vitest";
import {
  InstructorAssignmentAdvancedController,
  InstructorShowcaseController,
  InstructorShowcaseItemController,
  InstructorSubmissionAdvancedController,
  LearnerPeerReviewController,
  LearnerPortfolioController,
  LearnerSubmissionAnnotationController,
  PublicPortfolioController,
  PublicShowcaseController,
} from "./advanced-assignment.controller";

const org = { id: "org-a" } as any;
const user = { id: "u-1" } as any;

function service() {
  return {
    listGroups: vi.fn().mockResolvedValue([]),
    createGroup: vi.fn().mockResolvedValue({ id: "g1" }),
    updateGroup: vi.fn().mockResolvedValue({ id: "g1" }),
    deleteGroup: vi.fn().mockResolvedValue({ id: "g1" }),
    addGroupMember: vi.fn().mockResolvedValue({ id: "gm1" }),
    removeGroupMember: vi.fn().mockResolvedValue({ id: "gm1" }),
    getPeerReviewConfig: vi.fn().mockResolvedValue({ id: "prc" }),
    upsertPeerReviewConfig: vi.fn().mockResolvedValue({ id: "prc" }),
    generatePeerReviewMatches: vi.fn().mockResolvedValue({ count: 1 }),
    listPeerReviewMatchesForInstructor: vi.fn().mockResolvedValue([]),
    updateAssignmentCollaboration: vi.fn().mockResolvedValue({ id: "a1" }),
    listAnnotations: vi.fn().mockResolvedValue([]),
    createAnnotation: vi.fn().mockResolvedValue({ id: "an1" }),
    updateAnnotation: vi.fn().mockResolvedValue({ id: "an1" }),
    deleteAnnotation: vi.fn().mockResolvedValue({ id: "an1" }),
    listPlagiarismChecks: vi.fn().mockResolvedValue([]),
    runPlagiarismCheck: vi.fn().mockResolvedValue({ id: "pc1" }),
    listShowcases: vi.fn().mockResolvedValue([]),
    createShowcase: vi.fn().mockResolvedValue({ id: "sc1" }),
    updateShowcase: vi.fn().mockResolvedValue({ id: "sc1" }),
    deleteShowcase: vi.fn().mockResolvedValue({ id: "sc1" }),
    listPeerReviewsForLearner: vi.fn().mockResolvedValue([]),
    submitPeerReview: vi.fn().mockResolvedValue({ id: "pr1" }),
    getMyPortfolio: vi.fn().mockResolvedValue({ id: "pf1" }),
    updateMyPortfolio: vi.fn().mockResolvedValue({ id: "pf1" }),
    addPortfolioEntry: vi.fn().mockResolvedValue({ id: "pe1" }),
    updatePortfolioEntry: vi.fn().mockResolvedValue({ id: "pe1" }),
    removePortfolioEntry: vi.fn().mockResolvedValue({ id: "pe1" }),
    getPublicPortfolio: vi.fn().mockResolvedValue({ id: "pf1" }),
    listPublicShowcases: vi.fn().mockResolvedValue([]),
    recordShowcaseView: vi.fn().mockResolvedValue({ id: "sc1" }),
  };
}

describe("Advanced assignment controllers", () => {
  it("delegates instructor assignment advanced endpoints", async () => {
    const svc = service();
    const c = new InstructorAssignmentAdvancedController(svc as any);
    await c.listGroups(org, user, "a1");
    await c.createGroup(org, user, "a1", { name: "G" } as any);
    await c.updateGroup(org, user, "a1", "g1", { name: "G2" } as any);
    await c.deleteGroup(org, user, "a1", "g1");
    await c.addMember(org, user, "a1", "g1", { userId: "u2" } as any);
    await c.removeMember(org, user, "a1", "g1", "u2");
    await c.getPeerReviewConfig(org, user, "a1");
    await c.createPeerReviewConfig(org, user, "a1", { reviewsRequired: 1 } as any);
    await c.updatePeerReviewConfig(org, user, "a1", { reviewsRequired: 2 } as any);
    await c.generatePeerReviewMatches(org, user, "a1");
    await c.listPeerReviewMatches(org, user, "a1");
    await c.updateCollaboration(org, user, "a1", {
      collaborationMode: "GROUP",
    } as any);
    expect(svc.listGroups).toHaveBeenCalled();
    expect(svc.updateAssignmentCollaboration).toHaveBeenCalled();
  });

  it("delegates instructor submission/showcase endpoints", async () => {
    const svc = service();
    const sub = new InstructorSubmissionAdvancedController(svc as any);
    await sub.listAnnotations(org, "s1");
    await sub.createAnnotation(org, user, "s1", {
      startOffset: 0,
      endOffset: 1,
      comment: "c",
    } as any);
    await sub.updateAnnotation(org, user, "s1", "an1", { resolved: true } as any);
    await sub.deleteAnnotation(org, user, "s1", "an1");
    await sub.listPlagiarism(org, user, "s1");
    await sub.runPlagiarism(org, user, "s1", {} as any);

    const show = new InstructorShowcaseController(svc as any);
    await show.list(org, user, "c1");
    await show.create(org, user, "c1", {
      submissionId: "s1",
      title: "T",
    } as any);
    const item = new InstructorShowcaseItemController(svc as any);
    await item.update(org, user, "sc1", { title: "T2" } as any);
    await item.delete(org, user, "sc1");
    expect(svc.runPlagiarismCheck).toHaveBeenCalled();
    expect(svc.deleteShowcase).toHaveBeenCalled();
  });

  it("delegates learner and public endpoints", async () => {
    const svc = service();
    const peer = new LearnerPeerReviewController(svc as any);
    await peer.list(org, user);
    await peer.submit(org, user, "m1", { overallScore: 5 } as any);

    const ann = new LearnerSubmissionAnnotationController(svc as any);
    await ann.list(org, "s1");

    const portfolio = new LearnerPortfolioController(svc as any);
    await portfolio.get(org, user);
    await portfolio.create(org, user, {} as any);
    await portfolio.update(org, user, { title: "P" } as any);
    await portfolio.addEntry(org, user, { title: "E" } as any);
    await portfolio.updateEntry(org, user, "pe1", { title: "E2" } as any);
    await portfolio.removeEntry(org, user, "pe1");

    const pubPf = new PublicPortfolioController(svc as any);
    await pubPf.getPublic("tok");
    const pubSc = new PublicShowcaseController(svc as any);
    await pubSc.list("c1", org);
    await pubSc.recordView("c1", "sc1", org);
    expect(svc.getPublicPortfolio).toHaveBeenCalledWith("tok");
    expect(svc.recordShowcaseView).toHaveBeenCalled();
  });
});
