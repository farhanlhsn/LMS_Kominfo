"use client";

import type {
  ActivityContentResponse,
  ActivityProgress,
  AiStatus,
  AiTutorResponse,
  Assignment,
  AssignmentSubmission,
  AuthSession,
  Certificate,
  CertificateTemplate,
  CertificateVerification,
  ContentLibraryItem,
  Course,
  CalendarEvent,
  DiscussionThread,
  DiscussionReport,
  Enrollment,
  FileAsset,
  LearningCourseResponse,
  LearnerBookmark,
  LearnerAssignmentResponse,
  LearningGoal,
  LiveClass,
  InAppNotification,
  NotificationPreference,
  LearnerNote,
  Lesson,
  LessonWorkspaceState,
  LearningWorkspacePreference,
  OrganizationSummary,
  Plugin,
  PluginActivityType,
  PluginExecutionLog,
  Question,
  QuestionBank,
  Quiz,
  QuizAnswer,
  QuizAttempt,
  LearnerQuizResponse,
  QuizResult,
  Rubric,
  TranscriptSegment,
  WorkspaceContext,
  LearnerDashboard,
  LearnerCourseProgress,
  InstructorDashboard,
  AdminOverview,
  DailyTrend,
  AuditLogEntry,
  LearningPath,
  LearningPathEnrollment,
  Skill,
  CourseSkill,
  UserSkill,
  XpTransaction,
  LeaderboardEntry,
  Achievement,
  UserAchievement,
  Order,
  Payment,
  Coupon,
  SubscriptionPlan,
  UserSubscription,
  Branding,
  SsoProvider,
  LoginPolicy,
  OrgDomain,
  ApiKey,
  WebhookEndpoint,
  WebhookDelivery,
  CourseReview,
  WishlistItem,
  FavoriteInstructor,
  RecentlyViewedCourse,
  NotesExport,
  ScormPackage,
  ScormAttempt,
  H5PContent,
  H5PResult,
  XapiStatement,
  XapiStateResponse,
  Survey,
  SurveyWithQuestions,
  SurveyResponse as SurveyResponseEntry,
  Poll,
  PollResults,
  CourseFeedbackEntry,
  CourseFeedbackListResponse,
  SurveyQuestion,
} from "./lms-types";

const SESSION_KEY = "lms.session.v1";

export class ApiClientError extends Error {
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

interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

interface ApiFailure {
  success: false;
  error: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export interface ListResponse<T> {
  data: T[];
  meta?: Record<string, unknown>;
}

export function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setSession(session: AuthSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("lms-session-changed"));
}

function mergeSession(session: AuthSession, patch: Partial<AuthSession>) {
  const next = {
    ...session,
    ...patch,
    user: patch.user ?? session.user,
    activeOrganization: patch.activeOrganization ?? session.activeOrganization,
  };
  setSession(next);
  return next;
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("lms-session-changed"));
}

function authHeaders(session: AuthSession | null, base?: HeadersInit) {
  const headers = new Headers(base);
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }
  if (session?.activeOrganization?.id) {
    headers.set("x-organization-id", session.activeOrganization.id);
  }
  return headers;
}

// Shared in-flight refresh so multiple concurrent 401s trigger a single
// /auth/refresh call (avoids refresh-token rotation racing against itself).
let refreshPromise: Promise<AuthSession | null> | null = null;

async function refreshSession(): Promise<AuthSession | null> {
  const current = getSession();
  if (!current?.refreshToken) {
    return null;
  }
  try {
    const response = await fetch(`${apiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    const body = (await response.json().catch(() => null)) as
      | ApiSuccess<{ tokens: { accessToken: string; refreshToken: string } }>
      | ApiFailure
      | null;
    if (!response.ok || body?.success !== true) {
      return null;
    }
    // Keep the already-hydrated user/organization context; only rotate tokens.
    return mergeSession(current, {
      accessToken: body.data.tokens.accessToken,
      refreshToken: body.data.tokens.refreshToken ?? current.refreshToken,
    });
  } catch {
    return null;
  }
}

function ensureRefreshedSession(): Promise<AuthSession | null> {
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function requestOnce<T>(
  path: string,
  init: RequestInit,
  session: AuthSession | null,
) {
  const headers = authHeaders(session, init.headers);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiBaseUrl()}${path}`, { ...init, headers });
  const body = (await response.json().catch(() => null)) as
    ApiSuccess<T> | ApiFailure | null;
  return { response, body };
}

function throwApiError(
  response: Response,
  body: ApiSuccess<unknown> | ApiFailure | null,
): never {
  const error = body?.success === false ? body.error : undefined;
  throw new ApiClientError(
    error?.message ?? response.statusText ?? "Request failed",
    response.status,
    error?.code,
    error?.details,
  );
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = getSession();
  let { response, body } = await requestOnce<T>(path, init, session);

  // On an expired access token, transparently refresh once and retry. Skip the
  // refresh endpoint itself to avoid recursion.
  if (
    response.status === 401 &&
    session?.refreshToken &&
    !path.startsWith("/auth/refresh")
  ) {
    const refreshed = await ensureRefreshedSession();
    if (refreshed) {
      ({ response, body } = await requestOnce<T>(path, init, refreshed));
    } else {
      clearSession();
    }
  }

  if (!response.ok || body?.success === false) {
    throwApiError(response, body);
  }

  if (body?.success === true) {
    return body.data;
  }

  return body as T;
}

async function listOnce<T>(path: string, session: AuthSession | null) {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    headers: authHeaders(session),
  });
  const body = (await response.json().catch(() => null)) as
    (ApiSuccess<T[]> & { meta?: Record<string, unknown> }) | ApiFailure | null;
  return { response, body };
}

export async function apiList<T>(path: string): Promise<ListResponse<T>> {
  const session = getSession();
  let { response, body } = await listOnce<T>(path, session);

  if (
    response.status === 401 &&
    session?.refreshToken &&
    !path.startsWith("/auth/refresh")
  ) {
    const refreshed = await ensureRefreshedSession();
    if (refreshed) {
      ({ response, body } = await listOnce<T>(path, refreshed));
    } else {
      clearSession();
    }
  }

  if (!response.ok || body?.success === false) {
    throwApiError(response, body);
  }

  return {
    data: body?.success === true ? body.data : [],
    meta: body?.success === true ? body.meta : undefined,
  };
}

export const api = {
  login: async (email: string, password: string) => {
    const data = await apiRequest<{
      user: AuthSession["user"];
      activeOrganization: AuthSession["activeOrganization"];
      tokens: { accessToken: string; refreshToken: string };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const session: AuthSession = {
      user: data.user,
      activeOrganization: data.activeOrganization,
      accessToken: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
    };
    setSession(session);
    return api.hydrateSession().catch(() => session);
  },
  register: async (input: {
    name?: string;
    email: string;
    password: string;
    organizationName: string;
    organizationSlug?: string;
  }) => {
    const data = await apiRequest<{
      user: AuthSession["user"];
      activeOrganization: AuthSession["activeOrganization"];
      tokens: { accessToken: string; refreshToken: string };
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const session: AuthSession = {
      user: data.user,
      activeOrganization: data.activeOrganization,
      accessToken: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
    };
    setSession(session);
    return api.hydrateSession().catch(() => session);
  },
  logout: async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } finally {
      clearSession();
    }
  },
  refresh: () => ensureRefreshedSession(),
  me: () =>
    apiRequest<{
      user: AuthSession["user"];
      activeOrganization: AuthSession["activeOrganization"] | null;
      organizations: OrganizationSummary[];
    }>("/auth/me"),
  organizations: () => apiRequest<OrganizationSummary[]>("/auth/organizations"),
  switchOrganization: async (organizationId: string) => {
    const current = getSession();
    if (!current) throw new ApiClientError("Session is required", 401);
    const data = await apiRequest<{
      activeOrganization: AuthSession["activeOrganization"];
      tokens: { accessToken: string };
    }>("/auth/switch-organization", {
      method: "POST",
      body: JSON.stringify({ organizationId }),
    });
    return mergeSession(current, {
      activeOrganization: data.activeOrganization,
      accessToken: data.tokens.accessToken,
    });
  },
  hydrateSession: async () => {
    const current = getSession();
    if (!current?.accessToken) return current;
    const data = await api.me();
    if (!data.activeOrganization) return current;
    return mergeSession(current, {
      user: data.user,
      activeOrganization: data.activeOrganization,
      organizations: data.organizations,
    });
  },
  courses: () => apiList<Course>("/courses"),
  courseDetail: (slugOrId: string) =>
    apiRequest<Course>(`/courses/${encodeURIComponent(slugOrId)}`),
  courseCurriculum: (courseId: string) =>
    apiRequest<Course>(`/courses/${encodeURIComponent(courseId)}/curriculum`),
  enrollCourse: (courseId: string) =>
    apiRequest<Enrollment>(`/courses/${encodeURIComponent(courseId)}/enroll`, {
      method: "POST",
    }),
  myEnrollments: () => apiRequest<Enrollment[]>("/my/enrollments"),
  learningCourse: (courseId: string) =>
    apiRequest<LearningCourseResponse>(
      `/learn/courses/${encodeURIComponent(courseId)}`,
    ),
  lesson: (lessonId: string) =>
    apiRequest<Lesson>(`/learn/lessons/${encodeURIComponent(lessonId)}`),
  activityContent: (activityId: string) =>
    apiRequest<ActivityContentResponse>(
      `/learn/activities/${encodeURIComponent(activityId)}/content`,
    ),
  startActivity: (activityId: string) =>
    apiRequest(`/learn/activities/${encodeURIComponent(activityId)}/start`, {
      method: "POST",
    }),
  completeActivity: (activityId: string) =>
    apiRequest<{
      activityProgress: unknown;
      courseProgress: { progressPercent: number };
    }>(`/learn/activities/${encodeURIComponent(activityId)}/complete`, {
      method: "POST",
    }),
  updateActivityProgress: (
    activityId: string,
    progressPercent: number,
    metadata?: Record<string, unknown>,
  ) =>
    apiRequest(`/learn/activities/${encodeURIComponent(activityId)}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ progressPercent, metadata }),
    }),
  updateVideoProgress: (
    activityId: string,
    currentTimeSeconds: number,
    durationSeconds: number,
    watchedPercent?: number,
  ) =>
    apiRequest<ActivityProgress>(
      `/learn/activities/${encodeURIComponent(activityId)}/video-progress`,
      {
        method: "PATCH",
        body: JSON.stringify({
          currentTimeSeconds,
          durationSeconds,
          watchedPercent,
        }),
      },
    ),
  workspacePreferences: () =>
    apiRequest<LearningWorkspacePreference>("/learn/workspace/preferences"),
  updateWorkspacePreferences: (input: Record<string, unknown>) =>
    apiRequest<LearningWorkspacePreference>("/learn/workspace/preferences", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  workspaceState: (query: {
    courseId?: string | null;
    lessonId?: string | null;
    activityId?: string | null;
  }) => {
    const params = new URLSearchParams();
    if (query.courseId) params.set("courseId", query.courseId);
    if (query.lessonId) params.set("lessonId", query.lessonId);
    if (query.activityId) params.set("activityId", query.activityId);
    return apiRequest<LessonWorkspaceState>(
      `/learn/workspace/state?${params.toString()}`,
    );
  },
  updateWorkspaceState: (input: Record<string, unknown>) =>
    apiRequest<LessonWorkspaceState>("/learn/workspace/state", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  learnerNotes: (query: {
    courseId?: string | null;
    lessonId?: string | null;
    activityId?: string | null;
  }) => {
    const params = new URLSearchParams();
    if (query.courseId) params.set("courseId", query.courseId);
    if (query.lessonId) params.set("lessonId", query.lessonId);
    if (query.activityId) params.set("activityId", query.activityId);
    return apiRequest<LearnerNote[]>(`/learn/notes?${params.toString()}`);
  },
  createLearnerNote: (input: Record<string, unknown>) =>
    apiRequest<LearnerNote>("/learn/notes", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateLearnerNote: (noteId: string, input: Record<string, unknown>) =>
    apiRequest<LearnerNote>(`/learn/notes/${encodeURIComponent(noteId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteLearnerNote: (noteId: string) =>
    apiRequest<LearnerNote>(`/learn/notes/${encodeURIComponent(noteId)}`, {
      method: "DELETE",
    }),
  learnerBookmarks: (query: {
    courseId?: string | null;
    lessonId?: string | null;
    activityId?: string | null;
  }) => {
    const params = new URLSearchParams();
    if (query.courseId) params.set("courseId", query.courseId);
    if (query.lessonId) params.set("lessonId", query.lessonId);
    if (query.activityId) params.set("activityId", query.activityId);
    return apiRequest<LearnerBookmark[]>(
      `/learn/bookmarks?${params.toString()}`,
    );
  },
  createLearnerBookmark: (input: Record<string, unknown>) =>
    apiRequest<LearnerBookmark>("/learn/bookmarks", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateLearnerBookmark: (bookmarkId: string, input: Record<string, unknown>) =>
    apiRequest<LearnerBookmark>(
      `/learn/bookmarks/${encodeURIComponent(bookmarkId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  deleteLearnerBookmark: (bookmarkId: string) =>
    apiRequest<LearnerBookmark>(
      `/learn/bookmarks/${encodeURIComponent(bookmarkId)}`,
      {
        method: "DELETE",
      },
    ),
  transcript: (activityId: string) =>
    apiRequest<TranscriptSegment[]>(
      `/learn/activities/${encodeURIComponent(activityId)}/transcript`,
    ),
  workspaceContext: (activityId: string) =>
    apiRequest<WorkspaceContext>(
      `/learn/activities/${encodeURIComponent(activityId)}/workspace-context`,
    ),
  instructorCourses: () => apiRequest<Course[]>("/instructor/courses"),
  instructorCourse: (courseId: string) =>
    apiRequest<Course>(`/instructor/courses/${encodeURIComponent(courseId)}`),
  createCourse: (input: Record<string, unknown>) =>
    apiRequest<Course>("/instructor/courses", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateCourse: (courseId: string, input: Record<string, unknown>) =>
    apiRequest<Course>(`/instructor/courses/${encodeURIComponent(courseId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteCourse: (courseId: string) =>
    apiRequest(`/instructor/courses/${encodeURIComponent(courseId)}`, {
      method: "DELETE",
    }),
  publishCourse: (courseId: string) =>
    apiRequest(`/instructor/courses/${encodeURIComponent(courseId)}/publish`, {
      method: "POST",
    }),
  archiveCourse: (courseId: string) =>
    apiRequest(`/instructor/courses/${encodeURIComponent(courseId)}/archive`, {
      method: "POST",
    }),
  duplicateCourse: (courseId: string) =>
    apiRequest<Course>(
      `/instructor/courses/${encodeURIComponent(courseId)}/duplicate`,
      {
        method: "POST",
      },
    ),
  createModule: (courseId: string, input: Record<string, unknown>) =>
    apiRequest(`/instructor/courses/${encodeURIComponent(courseId)}/modules`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateModule: (moduleId: string, input: Record<string, unknown>) =>
    apiRequest(`/instructor/modules/${encodeURIComponent(moduleId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteModule: (moduleId: string) =>
    apiRequest(`/instructor/modules/${encodeURIComponent(moduleId)}`, {
      method: "DELETE",
    }),
  createLesson: (moduleId: string, input: Record<string, unknown>) =>
    apiRequest(`/instructor/modules/${encodeURIComponent(moduleId)}/lessons`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateLesson: (lessonId: string, input: Record<string, unknown>) =>
    apiRequest(`/instructor/lessons/${encodeURIComponent(lessonId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteLesson: (lessonId: string) =>
    apiRequest(`/instructor/lessons/${encodeURIComponent(lessonId)}`, {
      method: "DELETE",
    }),
  createActivity: (lessonId: string, input: Record<string, unknown>) =>
    apiRequest(
      `/instructor/lessons/${encodeURIComponent(lessonId)}/activities`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  updateActivity: (activityId: string, input: Record<string, unknown>) =>
    apiRequest(`/instructor/activities/${encodeURIComponent(activityId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteActivity: (activityId: string) =>
    apiRequest(`/instructor/activities/${encodeURIComponent(activityId)}`, {
      method: "DELETE",
    }),
  updateActivityContent: (activityId: string, input: Record<string, unknown>) =>
    apiRequest(
      `/instructor/activities/${encodeURIComponent(activityId)}/content`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  attachFileToActivity: (activityId: string, fileId: string) =>
    apiRequest(
      `/instructor/activities/${encodeURIComponent(activityId)}/attach-file`,
      {
        method: "POST",
        body: JSON.stringify({ fileId }),
      },
    ),
  attachLibraryItemToActivity: (activityId: string, libraryItemId: string) =>
    apiRequest(
      `/instructor/activities/${encodeURIComponent(activityId)}/attach-library-item`,
      {
        method: "POST",
        body: JSON.stringify({ libraryItemId }),
      },
    ),
  files: () => apiList<FileAsset>("/files"),
  uploadFile: (formData: FormData) =>
    apiRequest<FileAsset>("/files/upload", {
      method: "POST",
      body: formData,
      headers: {},
    }),
  signedFileUrl: (fileId: string) =>
    apiRequest<{ url: string; expiresInSeconds: number }>(
      `/files/${encodeURIComponent(fileId)}/signed-url`,
      {
        method: "POST",
        body: JSON.stringify({ expiresInSeconds: 300 }),
      },
    ),
  contentLibrary: () => apiRequest<ContentLibraryItem[]>("/content-library"),
  createContentLibraryItem: (input: Record<string, unknown>) =>
    apiRequest<ContentLibraryItem>("/content-library", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  pluginActivityTypes: () =>
    apiRequest<{ organizationId: string; activityTypes: PluginActivityType[] }>(
      "/plugins/activity-types",
    ),
  adminPlugins: () => apiRequest<Plugin[]>("/admin/plugins"),
  adminPlugin: (pluginKey: string) =>
    apiRequest<Plugin>(`/admin/plugins/${encodeURIComponent(pluginKey)}`),
  enablePlugin: (pluginKey: string) =>
    apiRequest(`/admin/plugins/${encodeURIComponent(pluginKey)}/enable`, {
      method: "POST",
    }),
  disablePlugin: (pluginKey: string) =>
    apiRequest(`/admin/plugins/${encodeURIComponent(pluginKey)}/disable`, {
      method: "POST",
    }),
  updatePluginConfig: (pluginKey: string, config: Record<string, unknown>) =>
    apiRequest(`/admin/plugins/${encodeURIComponent(pluginKey)}/config`, {
      method: "PATCH",
      body: JSON.stringify({ config }),
    }),
  pluginLogs: (pluginKey: string) =>
    apiRequest<PluginExecutionLog[]>(
      `/admin/plugins/${encodeURIComponent(pluginKey)}/logs`,
    ),
  questionBanks: () => apiRequest<QuestionBank[]>("/instructor/question-banks"),
  createQuestionBank: (input: Record<string, unknown>) =>
    apiRequest<QuestionBank>("/instructor/question-banks", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  questions: (bankId?: string | null) =>
    apiRequest<Question[]>(
      `/instructor/questions${bankId ? `?bankId=${encodeURIComponent(bankId)}` : ""}`,
    ),
  createQuestion: (input: Record<string, unknown>) =>
    apiRequest<Question>("/instructor/questions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateQuestion: (questionId: string, input: Record<string, unknown>) =>
    apiRequest<Question>(
      `/instructor/questions/${encodeURIComponent(questionId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  instructorQuizzes: () => apiRequest<Quiz[]>("/instructor/quizzes"),
  createQuiz: (input: Record<string, unknown>) =>
    apiRequest<Quiz>("/instructor/quizzes", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  instructorQuiz: (quizId: string) =>
    apiRequest<Quiz>(`/instructor/quizzes/${encodeURIComponent(quizId)}`),
  updateQuiz: (quizId: string, input: Record<string, unknown>) =>
    apiRequest<Quiz>(`/instructor/quizzes/${encodeURIComponent(quizId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  publishQuiz: (quizId: string) =>
    apiRequest<Quiz>(
      `/instructor/quizzes/${encodeURIComponent(quizId)}/publish`,
      {
        method: "POST",
      },
    ),
  addQuizQuestion: (quizId: string, input: Record<string, unknown>) =>
    apiRequest(`/instructor/quizzes/${encodeURIComponent(quizId)}/questions`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  removeQuizQuestion: (quizId: string, questionId: string) =>
    apiRequest(
      `/instructor/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`,
      { method: "DELETE" },
    ),
  attachQuizToActivity: (activityId: string, quizId: string) =>
    apiRequest<Quiz>(
      `/instructor/activities/${encodeURIComponent(activityId)}/quiz`,
      {
        method: "POST",
        body: JSON.stringify({ quizId }),
      },
    ),
  quizAttempts: (quizId: string) =>
    apiRequest<QuizAttempt[]>(
      `/instructor/quizzes/${encodeURIComponent(quizId)}/attempts`,
    ),
  quizAttemptDetail: (attemptId: string) =>
    apiRequest<
      QuizAttempt & { answers: Array<QuizAnswer & { question: Question }> }
    >(`/instructor/quiz-attempts/${encodeURIComponent(attemptId)}`),
  manualGradeAnswer: (answerId: string, input: Record<string, unknown>) =>
    apiRequest<QuizAnswer>(
      `/instructor/quiz-answers/${encodeURIComponent(answerId)}/grade`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  learnerQuiz: (activityId: string) =>
    apiRequest<LearnerQuizResponse>(
      `/learn/activities/${encodeURIComponent(activityId)}/quiz`,
    ),
  startQuizAttempt: (activityId: string) =>
    apiRequest<QuizAttempt>(
      `/learn/activities/${encodeURIComponent(activityId)}/quiz/attempts`,
      { method: "POST" },
    ),
  saveQuizAnswer: (attemptId: string, input: Record<string, unknown>) =>
    apiRequest<QuizAnswer>(
      `/learn/quiz-attempts/${encodeURIComponent(attemptId)}/answers`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  submitQuizAttempt: (attemptId: string) =>
    apiRequest<QuizResult>(
      `/learn/quiz-attempts/${encodeURIComponent(attemptId)}/submit`,
      { method: "POST" },
    ),
  quizResult: (attemptId: string) =>
    apiRequest<QuizResult>(
      `/learn/quiz-attempts/${encodeURIComponent(attemptId)}/result`,
    ),
  aiStatus: () => apiRequest<AiStatus>("/ai/status"),
  askAiTutor: (input: {
    courseId: string;
    lessonId: string;
    activityId: string;
    question: string;
    conversationId?: string;
    selectedText?: string;
    includeNoteIds?: string[];
  }) =>
    apiRequest<AiTutorResponse>("/learn/ai/tutor", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  assignments: (courseId: string) =>
    apiRequest<Assignment[]>(
      `/instructor/courses/${encodeURIComponent(courseId)}/assignments`,
    ),
  createAssignment: (courseId: string, input: Record<string, unknown>) =>
    apiRequest<Assignment>(
      `/instructor/courses/${encodeURIComponent(courseId)}/assignments`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  assignment: (assignmentId: string) =>
    apiRequest<Assignment>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}`,
    ),
  updateAssignment: (assignmentId: string, input: Record<string, unknown>) =>
    apiRequest<Assignment>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  publishAssignment: (assignmentId: string) =>
    apiRequest<Assignment>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}/publish`,
      { method: "POST" },
    ),
  rubrics: () => apiRequest<Rubric[]>("/instructor/rubrics"),
  rubric: (rubricId: string) =>
    apiRequest<Rubric>(`/instructor/rubrics/${encodeURIComponent(rubricId)}`),
  createRubric: (input: Record<string, unknown>) =>
    apiRequest<Rubric>("/instructor/rubrics", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateRubric: (rubricId: string, input: Record<string, unknown>) =>
    apiRequest<Rubric>(`/instructor/rubrics/${encodeURIComponent(rubricId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  assignmentSubmissions: (assignmentId: string) =>
    apiRequest<AssignmentSubmission[]>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}/submissions`,
    ),
  submission: (submissionId: string) =>
    apiRequest<AssignmentSubmission>(
      `/instructor/submissions/${encodeURIComponent(submissionId)}`,
    ),
  gradeSubmission: (submissionId: string, input: Record<string, unknown>) =>
    apiRequest<AssignmentSubmission>(
      `/instructor/submissions/${encodeURIComponent(submissionId)}/grade`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  returnSubmission: (submissionId: string, input: Record<string, unknown>) =>
    apiRequest<AssignmentSubmission>(
      `/instructor/submissions/${encodeURIComponent(submissionId)}/return`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  learnerAssignment: (assignmentId: string) =>
    apiRequest<LearnerAssignmentResponse>(
      `/learn/assignments/${encodeURIComponent(assignmentId)}`,
    ),
  createSubmission: (assignmentId: string, input: Record<string, unknown>) =>
    apiRequest<AssignmentSubmission>(
      `/learn/assignments/${encodeURIComponent(assignmentId)}/submissions`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  updateSubmission: (submissionId: string, input: Record<string, unknown>) =>
    apiRequest<AssignmentSubmission>(
      `/learn/submissions/${encodeURIComponent(submissionId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  submitSubmission: (submissionId: string) =>
    apiRequest<AssignmentSubmission>(
      `/learn/submissions/${encodeURIComponent(submissionId)}/submit`,
      { method: "POST" },
    ),
  submissionResult: (submissionId: string) =>
    apiRequest<AssignmentSubmission>(
      `/learn/submissions/${encodeURIComponent(submissionId)}/result`,
    ),
  certificates: () => apiRequest<Certificate[]>("/learn/certificates"),
  certificate: (certificateId: string) =>
    apiRequest<Certificate>(
      `/learn/certificates/${encodeURIComponent(certificateId)}`,
    ),
  downloadCertificate: (certificateId: string) =>
    apiRequest<{ url: string; expiresInSeconds: number }>(
      `/learn/certificates/${encodeURIComponent(certificateId)}/download`,
    ),
  verifyCertificate: (verificationCode: string) =>
    apiRequest<CertificateVerification>(
      `/certificates/verify/${encodeURIComponent(verificationCode)}`,
    ),
  certificateTemplates: () =>
    apiRequest<CertificateTemplate[]>("/admin/certificate-templates"),
  createCertificateTemplate: (input: Record<string, unknown>) =>
    apiRequest<CertificateTemplate>("/admin/certificate-templates", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateCertificateTemplate: (
    templateId: string,
    input: Record<string, unknown>,
  ) =>
    apiRequest<CertificateTemplate>(
      `/admin/certificate-templates/${encodeURIComponent(templateId)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  courseCertificates: (courseId: string) =>
    apiRequest<Certificate[]>(
      `/instructor/courses/${encodeURIComponent(courseId)}/certificates`,
    ),
  issueCertificate: (courseId: string, input: Record<string, unknown>) =>
    apiRequest<Certificate>(
      `/instructor/courses/${encodeURIComponent(courseId)}/certificates/issue`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  revokeCertificate: (certificateId: string, reason?: string) =>
    apiRequest<Certificate>(
      `/instructor/certificates/${encodeURIComponent(certificateId)}/revoke`,
      { method: "POST", body: JSON.stringify({ reason }) },
    ),
  regenerateCertificatePdf: (certificateId: string) =>
    apiRequest<Certificate>(
      `/instructor/certificates/${encodeURIComponent(certificateId)}/generate-pdf`,
      { method: "POST" },
    ),
  downloadManagedCertificate: (certificateId: string) =>
    apiRequest<{ url: string; expiresInSeconds: number }>(
      `/instructor/certificates/${encodeURIComponent(certificateId)}/download`,
    ),
  learningGoals: () => apiRequest<LearningGoal[]>("/learn/goals"),
  createLearningGoal: (input: Record<string, unknown>) =>
    apiRequest<LearningGoal>("/learn/goals", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateLearningGoal: (goalId: string, input: Record<string, unknown>) =>
    apiRequest<LearningGoal>(`/learn/goals/${encodeURIComponent(goalId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  discussionThreads: (courseId: string, context?: { lessonId?: string; activityId?: string }) => {
    const query = new URLSearchParams({ courseId });
    if (context?.lessonId) query.set("lessonId", context.lessonId);
    if (context?.activityId) query.set("activityId", context.activityId);
    return apiRequest<DiscussionThread[]>(`/discussions?${query}`);
  },
  discussionThread: (id: string) => apiRequest<DiscussionThread>(`/discussions/${encodeURIComponent(id)}`),
  createDiscussionThread: (input: Record<string, unknown>) => apiRequest<DiscussionThread>("/discussions", { method: "POST", body: JSON.stringify(input) }),
  createDiscussionReply: (id: string, input: Record<string, unknown>) => apiRequest(`/discussions/${encodeURIComponent(id)}/replies`, { method: "POST", body: JSON.stringify(input) }),
  moderateDiscussionThread: (id: string, input: Record<string, unknown>) => apiRequest<DiscussionThread>(`/discussions/${encodeURIComponent(id)}/moderation`, { method: "PATCH", body: JSON.stringify(input) }),
  reportDiscussionThread: (id: string, input: Record<string, unknown>) => apiRequest(`/discussions/${encodeURIComponent(id)}/report`, { method: "POST", body: JSON.stringify(input) }),
  discussionReports: (courseId?: string) => apiRequest<DiscussionReport[]>(`/discussions/moderation/reports${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ""}`),
  resolveDiscussionReport: (id: string, input: Record<string, unknown>) => apiRequest(`/discussions/moderation/reports/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  liveClasses: (courseId?: string) => apiRequest<LiveClass[]>(`/live-classes${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ""}`),
  createLiveClass: (input: Record<string, unknown>) => apiRequest<LiveClass>("/live-classes", { method: "POST", body: JSON.stringify(input) }),
  updateLiveClass: (id: string, input: Record<string, unknown>) => apiRequest<LiveClass>(`/live-classes/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  cancelLiveClass: (id: string) => apiRequest<LiveClass>(`/live-classes/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
  joinLiveClass: (id: string) => apiRequest<{ meetingUrl: string }>(`/live-classes/${encodeURIComponent(id)}/join`, { method: "POST" }),
  notifications: () => apiRequest<InAppNotification[]>("/notifications"),
  unreadNotificationCount: () => apiRequest<{ count: number }>("/notifications/unread-count"),
  markNotificationRead: (id: string) => apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => apiRequest<{ updated: number }>("/notifications/read-all", { method: "POST" }),
  notificationPreferences: () => apiRequest<NotificationPreference>("/notifications/preferences"),
  updateNotificationPreferences: (input: Record<string, unknown>) => apiRequest<NotificationPreference>("/notifications/preferences", { method: "PATCH", body: JSON.stringify(input) }),
  calendarEvents: (input: { from: string; to: string; courseId?: string; type?: string }) => {
    const query = new URLSearchParams({ from: input.from, to: input.to });
    if (input.courseId) query.set("courseId", input.courseId);
    if (input.type) query.set("type", input.type);
    return apiRequest<CalendarEvent[]>(`/calendar/events?${query}`);
  },
  createCalendarEvent: (input: Record<string, unknown>) => apiRequest<CalendarEvent>("/calendar/events", { method: "POST", body: JSON.stringify(input) }),
  updateCalendarEvent: (id: string, input: Record<string, unknown>) => apiRequest<CalendarEvent>(`/calendar/events/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteCalendarEvent: (id: string) => apiRequest(`/calendar/events/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // Analytics
  learnerDashboard: () => apiRequest<LearnerDashboard>("/analytics/learner/dashboard"),
  learnerCourseProgress: (courseId: string) => apiRequest<LearnerCourseProgress>("/analytics/learner/progress/" + encodeURIComponent(courseId)),
  instructorDashboard: () => apiRequest<InstructorDashboard>("/analytics/instructor/dashboard"),
  instructorCourseRoster: (courseId: string, query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiRequest("/analytics/instructor/course/" + encodeURIComponent(courseId) + "/roster?" + q.toString()); },
  instructorCourseEngagement: (courseId: string, query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiRequest<{ daily: { date: string; events: number }[]; totalActiveLearners: number }>("/analytics/instructor/course/" + encodeURIComponent(courseId) + "/engagement?" + q.toString()); },
  adminOverview: () => apiRequest<AdminOverview>("/analytics/admin/overview"),
  adminCourseMetrics: (query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiRequest("/analytics/admin/courses?" + q.toString()); },
  adminTrends: (query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiRequest<DailyTrend[]>("/analytics/admin/trends?" + q.toString()); },
  auditLogs: (query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiList<AuditLogEntry>("/analytics/audit-logs?" + q.toString()); },
  recordEvent: (input: Record<string, unknown>) => apiRequest("/analytics/events", { method: "POST", body: JSON.stringify(input) }),
  triggerAggregation: () => apiRequest("/analytics/aggregate", { method: "POST" }),
  requestExport: (input: Record<string, unknown>) => apiRequest("/analytics/reports/export", { method: "POST", body: JSON.stringify(input) }),

  // Learning Paths
  createLearningPath: (input: Record<string, unknown>) => apiRequest<LearningPath>("/learning-paths", { method: "POST", body: JSON.stringify(input) }),
  learningPaths: (query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiList<LearningPath>("/learning-paths?" + q.toString()); },
  learningPath: (idOrSlug: string) => apiRequest<LearningPath>("/learning-paths/" + encodeURIComponent(idOrSlug)),
  updateLearningPath: (id: string, input: Record<string, unknown>) => apiRequest<LearningPath>("/learning-paths/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(input) }),
  deleteLearningPath: (id: string) => apiRequest("/learning-paths/" + encodeURIComponent(id), { method: "DELETE" }),
  addCourseToPath: (id: string, input: Record<string, unknown>) => apiRequest("/learning-paths/" + encodeURIComponent(id) + "/courses", { method: "POST", body: JSON.stringify(input) }),
  removeCourseFromPath: (id: string, courseId: string) => apiRequest("/learning-paths/" + encodeURIComponent(id) + "/courses/" + encodeURIComponent(courseId), { method: "DELETE" }),
  enrollLearningPath: (id: string) => apiRequest<LearningPathEnrollment>("/learning-paths/" + encodeURIComponent(id) + "/enroll", { method: "POST" }),
  myLearningPathEnrollments: () => apiRequest<LearningPathEnrollment[]>("/learning-paths/enrollments/mine"),

  // Skills
  createSkill: (input: Record<string, unknown>) => apiRequest<Skill>("/skills", { method: "POST", body: JSON.stringify(input) }),
  skills: (category?: string) => apiRequest<Skill[]>("/skills" + (category ? "?category=" + encodeURIComponent(category) : "")),
  setCourseSkills: (courseId: string, input: Record<string, unknown>[]) => apiRequest<CourseSkill[]>("/courses/" + encodeURIComponent(courseId) + "/skills", { method: "POST", body: JSON.stringify(input) }),
  courseSkills: (courseId: string) => apiRequest<CourseSkill[]>("/courses/" + encodeURIComponent(courseId) + "/skills"),
  mySkills: () => apiRequest<UserSkill[]>("/skills/mine"),

  // XP & Leaderboard
  myXpHistory: (query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiRequest("/xp/mine?" + q.toString()); },
  leaderboard: (query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiRequest<LeaderboardEntry[]>("/leaderboard?" + q.toString()); },

  // Achievements
  achievements: () => apiRequest<Achievement[]>("/achievements"),
  myAchievements: () => apiRequest<UserAchievement[]>("/achievements/mine"),
  createAchievement: (input: Record<string, unknown>) => apiRequest<Achievement>("/achievements", { method: "POST", body: JSON.stringify(input) }),

  // Marketplace
  setCoursePricing: (courseId: string, input: Record<string, unknown>) => apiRequest("/courses/" + encodeURIComponent(courseId) + "/pricing", { method: "POST", body: JSON.stringify(input) }),
  createCoupon: (input: Record<string, unknown>) => apiRequest<Coupon>("/coupons", { method: "POST", body: JSON.stringify(input) }),
  coupons: () => apiRequest<Coupon[]>("/coupons"),
  validateCoupon: (code: string, courseIds?: string[]) => apiRequest<Coupon>("/coupons/validate", { method: "POST", body: JSON.stringify({ code, courseIds }) }),
  createOrder: (input: Record<string, unknown>) => apiRequest<Order>("/orders", { method: "POST", body: JSON.stringify(input) }),
  myOrders: (query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiRequest("/orders/mine?" + q.toString()); },
  getOrder: (id: string) => apiRequest<Order>("/orders/" + encodeURIComponent(id)),
  adminOrders: (query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiRequest("/admin/orders?" + q.toString()); },
  confirmPayment: (input: Record<string, unknown>) => apiRequest<Payment>("/payments/confirm", { method: "POST", body: JSON.stringify(input) }),
  approvePayment: (input: Record<string, unknown>) => apiRequest<Payment>("/payments/approve", { method: "POST", body: JSON.stringify(input) }),
  adminPayments: (query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiRequest("/admin/payments?" + q.toString()); },
  subscriptionPlans: () => apiRequest<SubscriptionPlan[]>("/subscription-plans"),
  subscribe: (planId: string) => apiRequest<UserSubscription>("/subscription-plans/" + encodeURIComponent(planId) + "/subscribe", { method: "POST" }),
  mySubscriptions: () => apiRequest<UserSubscription[]>("/subscriptions/mine"),


  // Enterprise
  getBranding: () => apiRequest<Branding>("/enterprise/branding"),
  updateBranding: (input: Record<string, unknown>) => apiRequest<Branding>("/enterprise/branding", { method: "PATCH", body: JSON.stringify(input) }),
  ssoProviders: () => apiRequest<SsoProvider[]>("/enterprise/sso-providers"),
  createSsoProvider: (input: Record<string, unknown>) => apiRequest<SsoProvider>("/enterprise/sso-providers", { method: "POST", body: JSON.stringify(input) }),
  updateSsoProvider: (id: string, input: Record<string, unknown>) => apiRequest<SsoProvider>("/enterprise/sso-providers/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(input) }),
  deleteSsoProvider: (id: string) => apiRequest("/enterprise/sso-providers/" + encodeURIComponent(id), { method: "DELETE" }),
  getLoginPolicy: () => apiRequest<LoginPolicy>("/enterprise/login-policy"),
  updateLoginPolicy: (input: Record<string, unknown>) => apiRequest<LoginPolicy>("/enterprise/login-policy", { method: "PATCH", body: JSON.stringify(input) }),
  domains: () => apiRequest<OrgDomain[]>("/enterprise/domains"),
  createDomain: (input: Record<string, unknown>) => apiRequest<OrgDomain>("/enterprise/domains", { method: "POST", body: JSON.stringify(input) }),
  verifyDomain: (id: string) => apiRequest<OrgDomain>("/enterprise/domains/" + encodeURIComponent(id) + "/verify", { method: "POST" }),
  deleteDomain: (id: string) => apiRequest("/enterprise/domains/" + encodeURIComponent(id), { method: "DELETE" }),
  apiKeys: () => apiRequest<ApiKey[]>("/enterprise/api-keys"),
  createApiKey: (input: Record<string, unknown>) => apiRequest<ApiKey>("/enterprise/api-keys", { method: "POST", body: JSON.stringify(input) }),
  revokeApiKey: (id: string) => apiRequest<ApiKey>("/enterprise/api-keys/" + encodeURIComponent(id) + "/revoke", { method: "POST" }),
  webhooks: () => apiRequest<WebhookEndpoint[]>("/enterprise/webhooks"),
  createWebhook: (input: Record<string, unknown>) => apiRequest<WebhookEndpoint>("/enterprise/webhooks", { method: "POST", body: JSON.stringify(input) }),
  deleteWebhook: (id: string) => apiRequest("/enterprise/webhooks/" + encodeURIComponent(id), { method: "DELETE" }),
  webhookDeliveries: (endpointId: string, query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiRequest("/enterprise/webhooks/" + encodeURIComponent(endpointId) + "/deliveries?" + q.toString()); },

  // Reviews, wishlist, favorites
  courseReviews: (courseId: string, query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiList<CourseReview>("/courses/" + encodeURIComponent(courseId) + "/reviews?" + q.toString()); },
  createCourseReview: (input: { courseId: string; rating: number; title?: string; body?: string }) =>
    apiRequest("/reviews", { method: "POST", body: JSON.stringify(input) }),
  updateCourseReview: (id: string, input: { rating?: number; title?: string; body?: string }) =>
    apiRequest("/reviews/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(input) }),
  deleteCourseReview: (id: string) =>
    apiRequest("/reviews/" + encodeURIComponent(id), { method: "DELETE" }),
  moderateReview: (id: string, input: { status: "APPROVED" | "REJECTED" }) =>
    apiRequest("/admin/reviews/" + encodeURIComponent(id) + "/moderate", { method: "PATCH", body: JSON.stringify(input) }),
  wishlist: () => apiRequest<WishlistItem[]>("/wishlist"),
  addWishlist: (input: { courseId: string }) =>
    apiRequest("/wishlist", { method: "POST", body: JSON.stringify(input) }),
  removeWishlist: (courseId: string) =>
    apiRequest("/wishlist/" + encodeURIComponent(courseId), { method: "DELETE" }),
  favoriteInstructors: () => apiRequest<FavoriteInstructor[]>("/favorite-instructors"),
  addFavoriteInstructor: (input: { instructorId: string }) =>
    apiRequest("/favorite-instructors", { method: "POST", body: JSON.stringify(input) }),
  removeFavoriteInstructor: (instructorId: string) =>
    apiRequest("/favorite-instructors/" + encodeURIComponent(instructorId), { method: "DELETE" }),
  trackCourseView: (courseId: string) =>
    apiRequest("/courses/" + encodeURIComponent(courseId) + "/view", { method: "POST" }),
  recentlyViewed: () => apiRequest<RecentlyViewedCourse[]>("/recently-viewed"),
  adminReviews: (query?: Record<string, string>) => { const q = new URLSearchParams(query); return apiList<CourseReview>("/admin/reviews?" + q.toString()); },
  exportNotes: () => apiRequest<NotesExport>("/notes/export"),

  // Phase 16: Experiences
  // SCORM
  listScormPackages: (courseId?: string) =>
    apiRequest<ScormPackage[]>("/scorm/packages" + (courseId ? `?courseId=${encodeURIComponent(courseId)}` : "")),
  getScormPackage: (id: string) => apiRequest<ScormPackage>(`/scorm/packages/${id}`),
  createScormPackage: (input: Record<string, unknown>) =>
    apiRequest<ScormPackage>("/scorm/packages", { method: "POST", body: JSON.stringify(input) }),
  updateScormPackage: (id: string, input: Record<string, unknown>) =>
    apiRequest<ScormPackage>(`/scorm/packages/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteScormPackage: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/scorm/packages/${id}`, { method: "DELETE" }),
  startScormAttempt: (packageId: string, input: Record<string, unknown> = {}) =>
    apiRequest<ScormAttempt>(`/scorm/packages/${packageId}/attempts`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  commitScormAttempt: (packageId: string, attemptId: string, input: Record<string, unknown>) =>
    apiRequest<ScormAttempt>(`/scorm/packages/${packageId}/attempts/${attemptId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  listScormAttempts: (packageId: string) =>
    apiRequest<ScormAttempt[]>(`/scorm/packages/${packageId}/attempts`),

  // H5P
  listH5PContent: (courseId?: string) =>
    apiRequest<H5PContent[]>("/h5p/contents" + (courseId ? `?courseId=${encodeURIComponent(courseId)}` : "")),
  getH5PContent: (id: string) => apiRequest<H5PContent>(`/h5p/contents/${id}`),
  createH5PContent: (input: Record<string, unknown>) =>
    apiRequest<H5PContent>("/h5p/contents", { method: "POST", body: JSON.stringify(input) }),
  updateH5PContent: (id: string, input: Record<string, unknown>) =>
    apiRequest<H5PContent>(`/h5p/contents/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteH5PContent: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/h5p/contents/${id}`, { method: "DELETE" }),
  submitH5PResult: (contentId: string, input: Record<string, unknown>) =>
    apiRequest<H5PResult>(`/h5p/contents/${contentId}/results`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listH5PResults: (contentId: string) =>
    apiRequest<H5PResult[]>(`/h5p/contents/${contentId}/results`),

  // xAPI
  postXapiStatements: (statements: Array<Record<string, unknown>>) =>
    apiRequest<{ stored: number; ids: string[] }>("/xapi/statements", {
      method: "POST",
      body: JSON.stringify({ statements }),
    }),
  listXapiStatements: (limit = 50) =>
    apiRequest<XapiStatement[]>(`/xapi/statements?limit=${limit}`),
  getXapiState: (activityId: string, stateId: string, agent?: string) =>
    apiRequest<XapiStateResponse>(
      `/xapi/state?activityId=${encodeURIComponent(activityId)}&stateId=${encodeURIComponent(stateId)}&agent=${encodeURIComponent(agent ?? "")}`,
    ),
  putXapiState: (input: Record<string, unknown>) =>
    apiRequest<{ id: string }>("/xapi/state", { method: "PUT", body: JSON.stringify(input) }),

  // Surveys
  listSurveys: (query?: Record<string, string>) => {
    const q = new URLSearchParams(query);
    return apiRequest<Survey[]>("/surveys" + (q.toString() ? `?${q.toString()}` : ""));
  },
  getSurvey: (id: string) => apiRequest<SurveyWithQuestions>(`/surveys/${id}`),
  createSurvey: (input: Record<string, unknown>) =>
    apiRequest<Survey>("/surveys", { method: "POST", body: JSON.stringify(input) }),
  updateSurvey: (id: string, input: Record<string, unknown>) =>
    apiRequest<Survey>(`/surveys/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteSurvey: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/surveys/${id}`, { method: "DELETE" }),
  addSurveyQuestion: (surveyId: string, input: Record<string, unknown>) =>
    apiRequest<SurveyQuestion>(`/surveys/${surveyId}/questions`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  removeSurveyQuestion: (surveyId: string, questionId: string) =>
    apiRequest<{ deleted: boolean }>(`/surveys/${surveyId}/questions/${questionId}`, {
      method: "DELETE",
    }),
  submitSurveyResponse: (surveyId: string, input: Record<string, unknown>) =>
    apiRequest<SurveyResponseEntry>(`/surveys/${surveyId}/responses`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listSurveyResponses: (surveyId: string) =>
    apiRequest<SurveyResponseEntry[]>(`/surveys/${surveyId}/responses`),
  exportSurveyResponsesUrl: (surveyId: string) =>
    `${apiBaseUrl()}/surveys/${surveyId}/responses/export`,

  // Polls
  listPolls: (query?: Record<string, string>) => {
    const q = new URLSearchParams(query);
    return apiRequest<Poll[]>("/polls" + (q.toString() ? `?${q.toString()}` : ""));
  },
  getPoll: (id: string) => apiRequest<Poll>(`/polls/${id}`),
  createPoll: (input: Record<string, unknown>) =>
    apiRequest<Poll>("/polls", { method: "POST", body: JSON.stringify(input) }),
  updatePoll: (id: string, input: Record<string, unknown>) =>
    apiRequest<Poll>(`/polls/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deletePoll: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/polls/${id}`, { method: "DELETE" }),
  votePoll: (id: string, selected: string[]) =>
    apiRequest<{ id: string }>(`/polls/${id}/votes`, {
      method: "POST",
      body: JSON.stringify({ selected }),
    }),
  pollResults: (id: string) => apiRequest<PollResults>(`/polls/${id}/results`),

  // Course Feedback
  submitCourseFeedback: (input: { courseId: string; rating: number; comment?: string }) =>
    apiRequest<CourseFeedbackEntry>("/course-feedback", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listCourseFeedback: (courseId: string) =>
    apiRequest<CourseFeedbackListResponse>(
      `/course-feedback?courseId=${encodeURIComponent(courseId)}`,
    ),

  // Phase 14: Push notifications
  getPushVapidInfo: () =>
    apiRequest<{ configured: boolean; publicKey: string | null; subject: string | null }>(
      "/push/vapid",
    ),
  listPushSubscriptions: () =>
    apiRequest<Array<{
      id: string;
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent: string | null;
      expiresAt: string | null;
      createdAt: string;
    }>>("/push/subscriptions"),
  subscribePush: (input: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
    expirationTime?: number | null;
  }) =>
    apiRequest("/push/subscribe", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  unsubscribePush: (endpoint: string) =>
    apiRequest("/push/unsubscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint }),
    }),

};
