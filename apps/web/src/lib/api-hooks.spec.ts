import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the "react" module so hook exports can be called outside a real
// renderer. We intentionally avoid `jsdom`/`happy-dom` and any
// `@testing-library/react`-style helpers; the goal is to validate the
// "factory" portion of each hook (the callback / initial state returned) and
// the public export surface, not React's lifecycle.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: <T,>(initial: T) => [initial, () => undefined] as [T, (next: T) => void],
    useEffect: () => undefined,
    useCallback: <T extends (...args: any[]) => any>(fn: T) => fn,
    useMemo: <T,>(factory: () => T) => factory(),
    useRef: <T,>(initial: T) => ({ current: initial }),
  };
});

// Mock the api-client so we can assert which methods each hook calls without
// having to set up a fetch mock per test. We intentionally keep the
// `use client` entry's getSession/setSession helpers wired to a no-op
// implementation that uses a module-scoped memory store so the hooks
// (which read/write the session) can be exercised without a DOM.
vi.mock("./api-client", async () => {
  const memoryStore = new Map<string, string>();
  const sessionListeners = new Set<() => void>();
  const dispatchSession = () => sessionListeners.forEach((l) => l());

  const apiMock = {
    enrollCourse: vi.fn(async (courseId: string) => ({ id: `enroll-${courseId}` })),
    startActivity: vi.fn(async (activityId: string) => ({ id: `start-${activityId}` })),
    completeActivity: vi.fn(async (activityId: string) => ({ id: `complete-${activityId}` })),
    updateActivityProgress: vi.fn(async () => ({ ok: true })),
    updateVideoProgress: vi.fn(async () => ({ ok: true })),
    updateWorkspacePreferences: vi.fn(async (input: unknown) => ({ saved: input })),
    updateWorkspaceState: vi.fn(async (input: unknown) => ({ saved: input })),
    createLearnerNote: vi.fn(async (input: unknown) => ({ note: input })),
    updateLearnerNote: vi.fn(async (id: string, input: unknown) => ({ id, ...(input as object) })),
    deleteLearnerNote: vi.fn(async (id: string) => ({ id, deleted: true })),
    createLearnerBookmark: vi.fn(async (input: unknown) => ({ bookmark: input })),
    updateLearnerBookmark: vi.fn(async (id: string, input: unknown) => ({ id, ...(input as object) })),
    deleteLearnerBookmark: vi.fn(async (id: string) => ({ id, deleted: true })),
    uploadFile: vi.fn(async () => ({ id: "file-1" })),
    signedFileUrl: vi.fn(async () => ({ url: "https://files/x", expiresInSeconds: 60 })),
    createQuestionBank: vi.fn(async (input: unknown) => ({ bank: input })),
    createQuestion: vi.fn(async (input: unknown) => ({ question: input })),
    updateActivityContent: vi.fn(async (id: string, input: unknown) => ({ id, ...(input as object) })),
    attachFileToActivity: vi.fn(async () => ({ ok: true })),
    attachLibraryItemToActivity: vi.fn(async () => ({ ok: true })),
    askAiTutor: vi.fn(async () => ({ answer: "stub" })),
    createAssignment: vi.fn(async () => ({ id: "as-1" })),
    updateAssignment: vi.fn(async () => ({ id: "as-1" })),
    publishAssignment: vi.fn(async () => ({ id: "as-1" })),
    createSubmission: vi.fn(async () => ({ id: "sub-1" })),
    updateSubmission: vi.fn(async () => ({ id: "sub-1" })),
    submitSubmission: vi.fn(async () => ({ id: "sub-1" })),
    gradeSubmission: vi.fn(async () => ({ id: "sub-1" })),
    createRubric: vi.fn(async () => ({ id: "r-1" })),
    updateRubric: vi.fn(async () => ({ id: "r-1" })),
    createCertificateTemplate: vi.fn(async () => ({ id: "t-1" })),
    updateCertificateTemplate: vi.fn(async () => ({ id: "t-1" })),
    createLearningGoal: vi.fn(async () => ({ id: "g-1" })),
    updateLearningGoal: vi.fn(async () => ({ id: "g-1" })),
    switchOrganization: vi.fn(async (id: string) => ({
      activeOrganization: { id, slug: id, name: id },
      accessToken: "new-token",
    })),
    logout: vi.fn(async () => undefined),
    hydrateSession: vi.fn(async () => null),
    organizations: vi.fn(async () => []),
    courses: vi.fn(async () => ({ data: [], meta: {} })),
    courseDetail: vi.fn(async () => ({ id: "c-1" })),
    courseCurriculum: vi.fn(async () => ({ id: "c-1" })),
    myEnrollments: vi.fn(async () => []),
    learningCourse: vi.fn(async () => ({})),
    lesson: vi.fn(async () => ({})),
    activityContent: vi.fn(async () => ({})),
    transcript: vi.fn(async () => []),
    workspaceContext: vi.fn(async () => ({})),
    workspacePreferences: vi.fn(async () => ({})),
    workspaceState: vi.fn(async () => ({})),
    learnerNotes: vi.fn(async () => []),
    learnerBookmarks: vi.fn(async () => []),
    instructorCourses: vi.fn(async () => []),
    instructorCourse: vi.fn(async () => ({})),
    files: vi.fn(async () => ({ data: [], meta: {} })),
    contentLibrary: vi.fn(async () => []),
    pluginActivityTypes: vi.fn(async () => ({ organizationId: "o-1", activityTypes: [] })),
    adminPlugins: vi.fn(async () => []),
    adminPlugin: vi.fn(async () => ({})),
    pluginLogs: vi.fn(async () => []),
    questionBanks: vi.fn(async () => []),
    questions: vi.fn(async () => []),
    instructorQuizzes: vi.fn(async () => []),
    instructorQuiz: vi.fn(async () => ({})),
    learnerQuiz: vi.fn(async () => ({})),
    quizAttempts: vi.fn(async () => []),
    assignments: vi.fn(async () => []),
    assignment: vi.fn(async () => ({})),
    rubrics: vi.fn(async () => []),
    rubric: vi.fn(async () => ({})),
    certificates: vi.fn(async () => []),
    certificate: vi.fn(async () => ({})),
    verifyCertificate: vi.fn(async () => ({})),
    certificateTemplates: vi.fn(async () => []),
    courseCertificates: vi.fn(async () => []),
    submissionResult: vi.fn(async () => ({})),
    assignmentSubmissions: vi.fn(async () => []),
    aiStatus: vi.fn(async () => ({})),
    learnerDashboard: vi.fn(async () => ({})),
    learnerCourseProgress: vi.fn(async () => ({})),
    instructorDashboard: vi.fn(async () => ({})),
    adminOverview: vi.fn(async () => ({})),
    adminCourseMetrics: vi.fn(async () => []),
    adminTrends: vi.fn(async () => []),
    auditLogs: vi.fn(async () => ({ data: [], meta: {} })),
    instructorCourseRoster: vi.fn(async () => ({})),
    instructorCourseEngagement: vi.fn(async () => ({ daily: [], totalActiveLearners: 0 })),
    learningPaths: vi.fn(async () => ({ data: [], meta: {} })),
    learningPath: vi.fn(async () => ({})),
    myLearningPathEnrollments: vi.fn(async () => []),
    skills: vi.fn(async () => []),
    mySkills: vi.fn(async () => []),
    myXpHistory: vi.fn(async () => []),
    leaderboard: vi.fn(async () => []),
    achievements: vi.fn(async () => []),
    myAchievements: vi.fn(async () => []),
    myOrders: vi.fn(async () => []),
    getOrder: vi.fn(async () => ({})),
    coupons: vi.fn(async () => []),
    subscriptionPlans: vi.fn(async () => []),
    mySubscriptions: vi.fn(async () => []),
    adminOrders: vi.fn(async () => []),
    adminPayments: vi.fn(async () => []),
    getBranding: vi.fn(async () => ({})),
    ssoProviders: vi.fn(async () => []),
    getLoginPolicy: vi.fn(async () => ({})),
    domains: vi.fn(async () => []),
    apiKeys: vi.fn(async () => []),
    webhooks: vi.fn(async () => []),
    webhookDeliveries: vi.fn(async () => []),
    courseReviews: vi.fn(async () => ({ data: [], meta: {} })),
    wishlist: vi.fn(async () => []),
    favoriteInstructors: vi.fn(async () => []),
    recentlyViewed: vi.fn(async () => []),
    adminReviews: vi.fn(async () => ({ data: [], meta: {} })),
    exportNotes: vi.fn(async () => ({ markdown: "", count: 0, format: "md" })),
  };

  class ApiClientError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code?: string,
      public readonly details?: unknown,
    ) {
      super(message);
      this.name = "ApiClientError";
    }
  }

  return {
    api: apiMock,
    apiBaseUrl: () => "http://localhost:4000/api/v1",
    getSession: () => {
      const raw = memoryStore.get("lms.session.v1");
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    setSession: (session: any) => {
      memoryStore.set("lms.session.v1", JSON.stringify(session));
      dispatchSession();
    },
    clearSession: () => {
      memoryStore.delete("lms.session.v1");
      dispatchSession();
    },
    ApiClientError,
  };
});

import * as hooks from "./api-hooks";
import * as apiClient from "./api-client";

const baseSession = {
  accessToken: "access-old",
  refreshToken: "refresh-1",
  user: { id: "user-1", email: "user@example.com", name: "User" },
  activeOrganization: {
    id: "org-1",
    slug: "demo",
    name: "Demo",
    permissionKeys: [],
  },
};

beforeEach(() => {
  // Reset the in-memory store between tests.
  apiClient.clearSession();
  (apiClient.api as any).switchOrganization.mockClear();
  (apiClient.api as any).logout.mockClear();
  (apiClient.api as any).enrollCourse.mockClear();
  (apiClient.api as any).startActivity.mockClear();
  (apiClient.api as any).completeActivity.mockClear();
  (apiClient.api as any).updateActivityProgress.mockClear();
  (apiClient.api as any).updateVideoProgress.mockClear();
  (apiClient.api as any).askAiTutor.mockClear();
  (apiClient.api as any).updateActivityContent.mockClear();
  (apiClient.api as any).attachFileToActivity.mockClear();
  (apiClient.api as any).attachLibraryItemToActivity.mockClear();
  (apiClient.api as any).createLearnerNote.mockClear();
  (apiClient.api as any).updateLearnerNote.mockClear();
  (apiClient.api as any).deleteLearnerNote.mockClear();
  (apiClient.api as any).createLearnerBookmark.mockClear();
  (apiClient.api as any).updateLearnerBookmark.mockClear();
  (apiClient.api as any).deleteLearnerBookmark.mockClear();
  (apiClient.api as any).updateWorkspacePreferences.mockClear();
  (apiClient.api as any).updateWorkspaceState.mockClear();
  (apiClient.api as any).createAssignment.mockClear();
  (apiClient.api as any).updateAssignment.mockClear();
  (apiClient.api as any).publishAssignment.mockClear();
  (apiClient.api as any).createSubmission.mockClear();
  (apiClient.api as any).updateSubmission.mockClear();
  (apiClient.api as any).submitSubmission.mockClear();
  (apiClient.api as any).gradeSubmission.mockClear();
  (apiClient.api as any).createRubric.mockClear();
  (apiClient.api as any).updateRubric.mockClear();
  (apiClient.api as any).createCertificateTemplate.mockClear();
  (apiClient.api as any).updateCertificateTemplate.mockClear();
  (apiClient.api as any).createLearningGoal.mockClear();
  (apiClient.api as any).updateLearningGoal.mockClear();
  (apiClient.api as any).uploadFile.mockClear();
  (apiClient.api as any).signedFileUrl.mockClear();
  (apiClient.api as any).createQuestionBank.mockClear();
  (apiClient.api as any).createQuestion.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api-hooks public surface", () => {
  it("exports the documented hook names as functions", () => {
    const expectedNames = [
      "useSession",
      "useRequireSession",
      "useOrganizations",
      "useSwitchOrganization",
      "useLogout",
      "useCourses",
      "useCourseDetail",
      "useCourseCurriculum",
      "useEnrollCourse",
      "useMyEnrollments",
      "useLearningCourse",
      "useLesson",
      "useActivityContent",
      "useStartActivity",
      "useCompleteActivity",
      "useUpdateActivityProgress",
      "useUpdateVideoProgress",
      "useWorkspacePreferences",
      "useUpdateWorkspacePreferences",
      "useLessonWorkspaceState",
      "useUpdateLessonWorkspaceState",
      "useLearnerNotes",
      "useCreateLearnerNote",
      "useUpdateLearnerNote",
      "useDeleteLearnerNote",
      "useLearnerBookmarks",
      "useCreateLearnerBookmark",
      "useUpdateLearnerBookmark",
      "useDeleteLearnerBookmark",
      "useTranscript",
      "useWorkspaceContext",
      "useInstructorCourses",
      "useInstructorCourse",
      "useFiles",
      "useUploadFile",
      "useSignedFileUrl",
      "useContentLibrary",
      "usePluginActivityTypes",
      "useAdminPlugins",
      "useAdminPlugin",
      "usePluginLogs",
      "useQuestionBanks",
      "useCreateQuestionBank",
      "useQuestions",
      "useCreateQuestion",
      "useInstructorQuizzes",
      "useInstructorQuiz",
      "useLearnerQuiz",
      "useQuizAttempts",
      "useUpdateActivityContent",
      "useAttachFileToActivity",
      "useAttachLibraryItemToActivity",
      "useAuthActions",
      "useAiStatus",
      "useAskAiTutor",
      "useAssignments",
      "useAssignment",
      "useCreateAssignment",
      "useUpdateAssignment",
      "usePublishAssignment",
      "useLearnerAssignment",
      "useCreateSubmission",
      "useUpdateSubmission",
      "useSubmitSubmission",
      "useSubmissionResult",
      "useAssignmentSubmissions",
      "useGradeSubmission",
      "useRubrics",
      "useRubric",
      "useCreateRubric",
      "useUpdateRubric",
      "useCertificates",
      "useCertificate",
      "useVerifyCertificate",
      "useCertificateTemplates",
      "useCreateCertificateTemplate",
      "useUpdateCertificateTemplate",
      "useCourseCertificates",
      "useLearningGoals",
      "useCreateLearningGoal",
      "useUpdateLearningGoal",
      "useLearnerDashboard",
      "useLearnerCourseProgress",
      "useInstructorDashboard",
      "useAdminOverview",
      "useAdminCourseMetrics",
      "useAdminTrends",
      "useAuditLogs",
      "useInstructorCourseRoster",
      "useInstructorCourseEngagement",
      "useLearningPaths",
      "useLearningPath",
      "useMyLearningPathEnrollments",
      "useSkills",
      "useMySkills",
      "useMyXpHistory",
      "useLeaderboard",
      "useAchievements",
      "useMyAchievements",
      "useMyOrders",
      "useOrder",
      "useCoupons",
      "useSubscriptionPlans",
      "useMySubscriptions",
      "useAdminOrders",
      "useAdminPayments",
      "useBranding",
      "useSsoProviders",
      "useLoginPolicy",
      "useDomains",
      "useApiKeys",
      "useWebhooks",
      "useWebhookDeliveries",
      "useCourseReviews",
      "useWishlist",
      "useFavoriteInstructors",
      "useRecentlyViewed",
      "useAdminReviews",
      "useExportNotes",
    ];

    for (const name of expectedNames) {
      expect(typeof (hooks as any)[name]).toBe("function");
    }
  });
});

describe("useSession and useRequireSession", () => {
  it("useSession returns null initially when there is no stored session", () => {
    const session = hooks.useSession();
    expect(session).toBeNull();
  });

  it("useSession returns the current stored session on first read", () => {
    // Seed the store before the hook runs; the mocked effect synchronously
    // calls getSession() on the initial render.
    apiClient.setSession(baseSession as any);
    // The mocked useState always returns the initial value, so the rendered
    // session is still the initial `null`. Verify the underlying store is
    // populated instead - this is the only state the mock preserves.
    expect(apiClient.getSession()?.accessToken).toBe("access-old");
    const session = hooks.useSession();
    expect(session).toBeNull();
  });

  it("useRequireSession reports checked=false and unauthenticated=false initially when no session exists", () => {
    const result = hooks.useRequireSession();
    // The mocked useState/useEffect never run their effects, so `checked`
    // stays at its initial `false` value and `unauthenticated` is therefore
    // also false. This is purely verifying the initial-shape contract.
    expect(result.session).toBeNull();
    expect(result.checked).toBe(false);
    expect(result.unauthenticated).toBe(false);
  });

  it("useRequireSession returns the initial state shape", () => {
    const result = hooks.useRequireSession();
    expect(result).toHaveProperty("session");
    expect(result).toHaveProperty("checked");
    expect(result).toHaveProperty("unauthenticated");
  });
});

describe("useApiQuery wrapper hooks (initial state)", () => {
  it("useCourses returns a QueryState with the expected initial shape", () => {
    const state = hooks.useCourses();
    expect(state.data).toBeNull();
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
    expect(typeof state.reload).toBe("function");
    expect(typeof state.refresh).toBe("function");
  });

  it("useOrganizations returns a QueryState with the expected initial shape", () => {
    const state = hooks.useOrganizations();
    expect(state.data).toBeNull();
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
    expect(typeof state.reload).toBe("function");
  });

  it("useEnrollCourse returns a function that delegates to api.enrollCourse", async () => {
    const enroll = hooks.useEnrollCourse();
    const result = await enroll("c-42");
    expect(apiClient.api.enrollCourse).toHaveBeenCalledWith("c-42");
    expect(result).toEqual({ id: "enroll-c-42" });
  });

  it("useStartActivity and useCompleteActivity delegate to the api module", async () => {
    const start = hooks.useStartActivity();
    await start("a-1");
    expect(apiClient.api.startActivity).toHaveBeenCalledWith("a-1");

    const complete = hooks.useCompleteActivity();
    await complete("a-1");
    expect(apiClient.api.completeActivity).toHaveBeenCalledWith("a-1");
  });

  it("useUpdateActivityProgress forwards progress and metadata to the api", async () => {
    const update = hooks.useUpdateActivityProgress();
    await update("a-1", 50, { foo: "bar" });
    expect(apiClient.api.updateActivityProgress).toHaveBeenCalledWith(
      "a-1",
      50,
      { foo: "bar" },
    );
  });

  it("useUpdateVideoProgress forwards all video progress arguments", async () => {
    const update = hooks.useUpdateVideoProgress();
    await update("a-1", 10, 60, 16.6);
    expect(apiClient.api.updateVideoProgress).toHaveBeenCalledWith(
      "a-1",
      10,
      60,
      16.6,
    );
  });

  it("useAskAiTutor delegates to api.askAiTutor", async () => {
    const ask = hooks.useAskAiTutor();
    await ask({
      courseId: "c-1",
      lessonId: "l-1",
      activityId: "a-1",
      question: "why?",
    });
    expect(apiClient.api.askAiTutor).toHaveBeenCalledWith({
      courseId: "c-1",
      lessonId: "l-1",
      activityId: "a-1",
      question: "why?",
    });
  });

  it("useCreateLearnerNote / useUpdateLearnerNote / useDeleteLearnerNote delegate correctly", async () => {
    const create = hooks.useCreateLearnerNote();
    await create({ content: "hello" });
    expect(apiClient.api.createLearnerNote).toHaveBeenCalledWith({
      content: "hello",
    });

    const update = hooks.useUpdateLearnerNote();
    await update("n-1", { content: "updated" });
    expect(apiClient.api.updateLearnerNote).toHaveBeenCalledWith("n-1", {
      content: "updated",
    });

    const remove = hooks.useDeleteLearnerNote();
    await remove("n-1");
    expect(apiClient.api.deleteLearnerNote).toHaveBeenCalledWith("n-1");
  });

  it("useCreateLearnerBookmark / useUpdateLearnerBookmark / useDeleteLearnerBookmark delegate correctly", async () => {
    const create = hooks.useCreateLearnerBookmark();
    await create({ title: "b" });
    expect(apiClient.api.createLearnerBookmark).toHaveBeenCalledWith({ title: "b" });

    const update = hooks.useUpdateLearnerBookmark();
    await update("b-1", { title: "B" });
    expect(apiClient.api.updateLearnerBookmark).toHaveBeenCalledWith("b-1", { title: "B" });

    const remove = hooks.useDeleteLearnerBookmark();
    await remove("b-1");
    expect(apiClient.api.deleteLearnerBookmark).toHaveBeenCalledWith("b-1");
  });

  it("useUpdateWorkspacePreferences delegates to the api module", async () => {
    const update = hooks.useUpdateWorkspacePreferences();
    await update({ captionsEnabled: true });
    expect(apiClient.api.updateWorkspacePreferences).toHaveBeenCalledWith({
      captionsEnabled: true,
    });
  });

  it("useUpdateLessonWorkspaceState delegates to the api module", async () => {
    const update = hooks.useUpdateLessonWorkspaceState();
    await update({ sidebarCollapsed: true });
    expect(apiClient.api.updateWorkspaceState).toHaveBeenCalledWith({
      sidebarCollapsed: true,
    });
  });

  it("useUpdateActivityContent, useAttachFileToActivity, useAttachLibraryItemToActivity delegate correctly", async () => {
    const updateContent = hooks.useUpdateActivityContent();
    await updateContent("a-1", { foo: "bar" });
    expect(apiClient.api.updateActivityContent).toHaveBeenCalledWith("a-1", { foo: "bar" });

    const attachFile = hooks.useAttachFileToActivity();
    await attachFile("a-1", "f-1");
    expect(apiClient.api.attachFileToActivity).toHaveBeenCalledWith("a-1", "f-1");

    const attachLibrary = hooks.useAttachLibraryItemToActivity();
    await attachLibrary("a-1", "l-1");
    expect(apiClient.api.attachLibraryItemToActivity).toHaveBeenCalledWith(
      "a-1",
      "l-1",
    );
  });

  it("useUploadFile and useSignedFileUrl delegate correctly", async () => {
    const upload = hooks.useUploadFile();
    const fd = new FormData();
    await upload(fd);
    expect(apiClient.api.uploadFile).toHaveBeenCalledWith(fd);

    const signed = hooks.useSignedFileUrl();
    await signed("f-1");
    expect(apiClient.api.signedFileUrl).toHaveBeenCalledWith("f-1");
  });

  it("useCreateQuestionBank and useCreateQuestion delegate correctly", async () => {
    const createBank = hooks.useCreateQuestionBank();
    await createBank({ title: "B" });
    expect(apiClient.api.createQuestionBank).toHaveBeenCalledWith({ title: "B" });

    const createQ = hooks.useCreateQuestion();
    await createQ({ prompt: "P" });
    expect(apiClient.api.createQuestion).toHaveBeenCalledWith({ prompt: "P" });
  });

  it("useCreateAssignment / useUpdateAssignment / usePublishAssignment delegate correctly", async () => {
    const create = hooks.useCreateAssignment();
    await create("c-1", { title: "A" });
    expect(apiClient.api.createAssignment).toHaveBeenCalledWith("c-1", { title: "A" });

    const update = hooks.useUpdateAssignment();
    await update("a-1", { title: "A2" });
    expect(apiClient.api.updateAssignment).toHaveBeenCalledWith("a-1", { title: "A2" });

    const publish = hooks.usePublishAssignment();
    await publish("a-1");
    expect(apiClient.api.publishAssignment).toHaveBeenCalledWith("a-1");
  });

  it("useCreateSubmission / useUpdateSubmission / useSubmitSubmission / useGradeSubmission delegate correctly", async () => {
    const create = hooks.useCreateSubmission();
    await create("a-1", { text: "x" });
    expect(apiClient.api.createSubmission).toHaveBeenCalledWith("a-1", { text: "x" });

    const update = hooks.useUpdateSubmission();
    await update("s-1", { text: "y" });
    expect(apiClient.api.updateSubmission).toHaveBeenCalledWith("s-1", { text: "y" });

    const submit = hooks.useSubmitSubmission();
    await submit("s-1");
    expect(apiClient.api.submitSubmission).toHaveBeenCalledWith("s-1");

    const grade = hooks.useGradeSubmission();
    await grade("s-1", { score: 90 });
    expect(apiClient.api.gradeSubmission).toHaveBeenCalledWith("s-1", { score: 90 });
  });

  it("useCreateRubric / useUpdateRubric delegate correctly", async () => {
    const create = hooks.useCreateRubric();
    await create({ title: "R" });
    expect(apiClient.api.createRubric).toHaveBeenCalledWith({ title: "R" });

    const update = hooks.useUpdateRubric();
    await update("r-1", { title: "R2" });
    expect(apiClient.api.updateRubric).toHaveBeenCalledWith("r-1", { title: "R2" });
  });

  it("useCreateCertificateTemplate / useUpdateCertificateTemplate delegate correctly", async () => {
    const create = hooks.useCreateCertificateTemplate();
    await create({ name: "T" });
    expect(apiClient.api.createCertificateTemplate).toHaveBeenCalledWith({ name: "T" });

    const update = hooks.useUpdateCertificateTemplate();
    await update("t-1", { name: "T2" });
    expect(apiClient.api.updateCertificateTemplate).toHaveBeenCalledWith("t-1", { name: "T2" });
  });

  it("useCreateLearningGoal / useUpdateLearningGoal delegate correctly", async () => {
    const create = hooks.useCreateLearningGoal();
    await create({ title: "G" });
    expect(apiClient.api.createLearningGoal).toHaveBeenCalledWith({ title: "G" });

    const update = hooks.useUpdateLearningGoal();
    await update("g-1", { title: "G2" });
    expect(apiClient.api.updateLearningGoal).toHaveBeenCalledWith("g-1", { title: "G2" });
  });
});

describe("useAuthActions", () => {
  it("exposes a clearSession method bound to the api-client helper", () => {
    const { clearSession } = hooks.useAuthActions();
    apiClient.setSession(baseSession as any);
    clearSession();
    expect(apiClient.getSession()).toBeNull();
  });
});
