"use client";

import type {
  ActivityContentResponse,
  ActivityProgress,
  AuthSession,
  ContentLibraryItem,
  Course,
  Enrollment,
  FileAsset,
  LearningCourseResponse,
  LearnerBookmark,
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
  TranscriptSegment,
  WorkspaceContext,
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

function apiBaseUrl() {
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
    activeOrganization:
      patch.activeOrganization ?? session.activeOrganization,
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
    | ApiSuccess<T>
    | ApiFailure
    | null;
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
    | (ApiSuccess<T[]> & { meta?: Record<string, unknown> })
    | ApiFailure
    | null;
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
    return apiRequest<LearnerBookmark[]>(`/learn/bookmarks?${params.toString()}`);
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
    apiRequest(`/instructor/lessons/${encodeURIComponent(lessonId)}/activities`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
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
    apiRequest(`/instructor/activities/${encodeURIComponent(activityId)}/content`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
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
  contentLibrary: () =>
    apiRequest<ContentLibraryItem[]>("/content-library"),
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
    apiRequest<Question>(`/instructor/questions/${encodeURIComponent(questionId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
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
    apiRequest<Quiz>(`/instructor/quizzes/${encodeURIComponent(quizId)}/publish`, {
      method: "POST",
    }),
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
    apiRequest<Quiz>(`/instructor/activities/${encodeURIComponent(activityId)}/quiz`, {
      method: "POST",
      body: JSON.stringify({ quizId }),
    }),
  quizAttempts: (quizId: string) =>
    apiRequest<QuizAttempt[]>(`/instructor/quizzes/${encodeURIComponent(quizId)}/attempts`),
  quizAttemptDetail: (attemptId: string) =>
    apiRequest<QuizAttempt & { answers: Array<QuizAnswer & { question: Question }> }>(
      `/instructor/quiz-attempts/${encodeURIComponent(attemptId)}`,
    ),
  manualGradeAnswer: (answerId: string, input: Record<string, unknown>) =>
    apiRequest<QuizAnswer>(`/instructor/quiz-answers/${encodeURIComponent(answerId)}/grade`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
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
};
