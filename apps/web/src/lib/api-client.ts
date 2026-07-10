"use client";

import type {
  CodeExecutionRecord,
  CodeJudgeResult,
  CodeLanguage,
  CodeSubmissionRecord,
  PanelEntry,
  PanelPosition,
  PanelSize,
  PluginInstallationRecord,
  PluginListingRecord,
  PluginListingStatus,
  PluginPanelDefinition,
  PluginPolicyRecord,
  PluginReviewRecord,
  PluginReviewStatus,
  PopoutSessionResponse,
  PopoutValidationResponse,
  ThreeDAssetRecord,
  ThreeDInteractionRecord,
  ThreeDSceneRecord,
  UserPanelLayoutRecord,
} from "./lms-types";
import type {
  ActivityContentResponse,
  ActivityProgress,
  AiStatus,
  AiGeneratedItem,
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
  OrganizationMemberRecord,
  OrganizationRoleRecord,
  LearnerNote,
  Lesson,
  LessonWorkspaceState,
  LearningWorkspacePreference,
  OrganizationSummary,
  PermissionRecord,
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
  VideoCaptionTrack,
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
  AssignmentGroup,
  PeerReviewConfig,
  PeerReviewMatch,
  PeerReview,
  PeerReviewRubricScore,
  SubmissionAnnotation,
  PlagiarismCheck,
  ProjectShowcase,
  Portfolio,
  PortfolioEntry,
  RealtimeEvent,
  RealtimeTransportInfo,
  RealtimePollResult,
  BulkJob,
  CreateBulkJobInput,
  CreateBulkJobResult,
  Conversation,
  CreateConversationInput,
  ChatMessage,
  SendMessageInput,
  GlobalSearchResult,
  SearchAnalytics,
  SearchEntityType,
  UserLocalePreference,
  OrgLocalePreference,
  HelpCategory,
  HelpArticle,
  SupportTicket,
  SupportTicketReply,
  TranscriptNote,
  NoteContext,
  NoteExportResult,
  ContentFlag,
  ModerationTargetType,
  ModerationReportStatus,
  ModerationActionType,
  ModerationReport,
  ModerationAction,
  LegalDocument,
  LegalDocumentType,
  ConsentRecord,
  DataExportRequest,
  AnonymizationRequest,
  RetentionPolicy,
  BackupJob,
  OAuthProvider,
  OAuthAccount,
  MfaFactor,
  MfaEnrollmentChallenge,
  RefreshSessionEntry,
  Cohort,
  CohortMember,
  CohortSchedule,
  UserTimezonePreference,
  ProctoringSession,
  ProctoringEvent,
  ProctoringFlag,
  ProctoringFlagStatus,
  ProctoringEventType,
  ProctoringSeverity,
  RevenueShareRule,
  Payout,
  PayoutMethod,
  PayoutPeriod,
  PayoutPeriodStatus,
  PayoutStatus,
  PayoutBeneficiaryType,
  PayoutMethodType,
  RevenueShareScope,
  TaxRegion,
  TaxRule,
  TaxCalculation,
  TaxRuleType,
  SupportedCurrency,
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
  return process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
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

function activeOrganizationId() {
  const organizationId = getSession()?.activeOrganization?.id;
  if (!organizationId) {
    throw new ApiClientError("Active organization is required", 400);
  }
  return organizationId;
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
  organizationMembers: () => {
    const organizationId = activeOrganizationId();
    return apiRequest<OrganizationMemberRecord[]>(
      `/organizations/${encodeURIComponent(organizationId)}/members`,
    );
  },
  createOrganizationMember: (input: {
    email: string;
    name?: string;
    password?: string;
    roleKeys?: string[];
  }) => {
    const organizationId = activeOrganizationId();
    return apiRequest<OrganizationMemberRecord>(
      `/organizations/${encodeURIComponent(organizationId)}/members`,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  updateOrganizationMemberRoles: (memberId: string, roleKeys: string[]) => {
    const organizationId = activeOrganizationId();
    return apiRequest<OrganizationMemberRecord>(
      `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberId)}/roles`,
      { method: "PATCH", body: JSON.stringify({ roleKeys }) },
    );
  },
  updateOrganizationMemberStatus: (
    memberId: string,
    status: OrganizationMemberRecord["status"],
  ) => {
    const organizationId = activeOrganizationId();
    return apiRequest<OrganizationMemberRecord>(
      `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberId)}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    );
  },
  organizationRoles: () => {
    const organizationId = activeOrganizationId();
    return apiRequest<OrganizationRoleRecord[]>(
      `/organizations/${encodeURIComponent(organizationId)}/roles`,
    );
  },
  organizationPermissions: () => {
    const organizationId = activeOrganizationId();
    return apiRequest<PermissionRecord[]>(
      `/organizations/${encodeURIComponent(organizationId)}/permissions`,
    );
  },
  createOrganizationRole: (input: {
    key: string;
    name: string;
    description?: string;
    permissionKeys?: string[];
  }) => {
    const organizationId = activeOrganizationId();
    return apiRequest<OrganizationRoleRecord>(
      `/organizations/${encodeURIComponent(organizationId)}/roles`,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  updateOrganizationRole: (
    roleId: string,
    input: {
      name?: string;
      description?: string;
      permissionKeys?: string[];
    },
  ) => {
    const organizationId = activeOrganizationId();
    return apiRequest<OrganizationRoleRecord>(
      `/organizations/${encodeURIComponent(organizationId)}/roles/${encodeURIComponent(roleId)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  },
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
  transcript: (activityId: string, query?: { language?: string | null }) => {
    const params = new URLSearchParams();
    if (query?.language) params.set("language", query.language);
    return apiRequest<TranscriptSegment[]>(
      `/learn/activities/${encodeURIComponent(activityId)}/transcript${params.size ? `?${params.toString()}` : ""}`,
    );
  },
  captionTracks: (activityId: string) =>
    apiRequest<VideoCaptionTrack[]>(
      `/learn/activities/${encodeURIComponent(activityId)}/captions`,
    ),
  workspaceContext: (activityId: string) =>
    apiRequest<WorkspaceContext>(
      `/learn/activities/${encodeURIComponent(activityId)}/workspace-context`,
    ),
  instructorCourses: () => apiRequest<Course[]>("/instructor/courses"),
  instructorCourse: (courseId: string) =>
    apiRequest<Course>(`/instructor/courses/${encodeURIComponent(courseId)}`),
  instructorCaptionTracks: (activityId: string) =>
    apiRequest<VideoCaptionTrack[]>(
      `/instructor/activities/${encodeURIComponent(activityId)}/captions`,
    ),
  createInstructorCaptionTrack: (
    activityId: string,
    input: Record<string, unknown>,
  ) =>
    apiRequest<VideoCaptionTrack>(
      `/instructor/activities/${encodeURIComponent(activityId)}/captions`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  updateInstructorCaptionTrack: (
    trackId: string,
    input: Record<string, unknown>,
  ) =>
    apiRequest<VideoCaptionTrack>(
      `/instructor/caption-tracks/${encodeURIComponent(trackId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  deleteInstructorCaptionTrack: (trackId: string) =>
    apiRequest<VideoCaptionTrack>(
      `/instructor/caption-tracks/${encodeURIComponent(trackId)}`,
      {
        method: "DELETE",
      },
    ),
  instructorAiGeneratedItems: (activityId: string) =>
    apiRequest<AiGeneratedItem[]>(
      `/instructor/activities/${encodeURIComponent(activityId)}/ai/generated-items`,
    ),
  generateInstructorVideoSummary: (
    activityId: string,
    input: Record<string, unknown>,
  ) =>
    apiRequest<AiGeneratedItem>(
      `/instructor/activities/${encodeURIComponent(activityId)}/ai/video-summary`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  generateInstructorVideoQuiz: (
    activityId: string,
    input: Record<string, unknown>,
  ) =>
    apiRequest<AiGeneratedItem>(
      `/instructor/activities/${encodeURIComponent(activityId)}/ai/video-quiz`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  listInstructorAiItems: (query: Record<string, string | undefined> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });
    return apiRequest<AiGeneratedItem[]>(
      `/instructor/ai/items${params.size ? `?${params.toString()}` : ""}`,
    );
  },
  getInstructorAiItem: (itemId: string) =>
    apiRequest<AiGeneratedItem>(
      `/instructor/ai/items/${encodeURIComponent(itemId)}`,
    ),
  updateInstructorAiItem: (itemId: string, input: Record<string, unknown>) =>
    apiRequest<AiGeneratedItem>(
      `/instructor/ai/items/${encodeURIComponent(itemId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  approveInstructorAiItem: (itemId: string) =>
    apiRequest<AiGeneratedItem>(
      `/instructor/ai/items/${encodeURIComponent(itemId)}/approve`,
      { method: "PATCH" },
    ),
  rejectInstructorAiItem: (itemId: string, reason?: string) =>
    apiRequest<AiGeneratedItem>(
      `/instructor/ai/items/${encodeURIComponent(itemId)}/reject`,
      {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      },
    ),
  publishInstructorAiItem: (itemId: string) =>
    apiRequest<AiGeneratedItem>(
      `/instructor/ai/items/${encodeURIComponent(itemId)}/publish`,
      { method: "POST" },
    ),
  // Phase 17 caption cue editor
  listInstructorCaptionCues: (trackId: string) =>
    apiRequest<unknown[]>(
      `/instructor/caption-tracks/${encodeURIComponent(trackId)}/cues`,
    ),
  createInstructorCaptionCue: (
    trackId: string,
    input: { startSeconds: number; endSeconds: number; text: string },
  ) =>
    apiRequest<VideoCaptionTrack>(
      `/instructor/caption-tracks/${encodeURIComponent(trackId)}/cues`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  updateInstructorCaptionCue: (
    trackId: string,
    cueIndex: number,
    input: { startSeconds?: number; endSeconds?: number; text?: string },
  ) =>
    apiRequest<VideoCaptionTrack>(
      `/instructor/caption-tracks/${encodeURIComponent(trackId)}/cues/${cueIndex}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  deleteInstructorCaptionCue: (trackId: string, cueIndex: number) =>
    apiRequest<VideoCaptionTrack>(
      `/instructor/caption-tracks/${encodeURIComponent(trackId)}/cues/${cueIndex}`,
      { method: "DELETE" },
    ),
  reorderInstructorCaptionCues: (trackId: string, orderedIndices: number[]) =>
    apiRequest<VideoCaptionTrack>(
      `/instructor/caption-tracks/${encodeURIComponent(trackId)}/cues/reorder`,
      {
        method: "POST",
        body: JSON.stringify({ orderedIndices }),
      },
    ),
  // Phase 18: Advanced assignment
  listAssignmentGroups: (assignmentId: string) =>
    apiRequest<AssignmentGroup[]>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}/groups`,
    ),
  createAssignmentGroup: (
    assignmentId: string,
    input: { name: string; maxMembers?: number; memberIds?: string[] },
  ) =>
    apiRequest<AssignmentGroup>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}/groups`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  updateAssignmentGroup: (
    assignmentId: string,
    groupId: string,
    input: { name?: string; maxMembers?: number; status?: "ACTIVE" | "ARCHIVED" },
  ) =>
    apiRequest<AssignmentGroup>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}/groups/${groupId}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  deleteAssignmentGroup: (assignmentId: string, groupId: string) =>
    apiRequest<{ id: string }>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}/groups/${groupId}`,
      { method: "DELETE" },
    ),
  addAssignmentGroupMember: (
    assignmentId: string,
    groupId: string,
    userId: string,
    role: "member" | "leader" = "member",
  ) =>
    apiRequest<{ id: string; userId: string }>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}/groups/${groupId}/members`,
      {
        method: "POST",
        body: JSON.stringify({ userId, role }),
      },
    ),
  removeAssignmentGroupMember: (
    assignmentId: string,
    groupId: string,
    userId: string,
  ) =>
    apiRequest<{ id: string }>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}/groups/${groupId}/members/${userId}`,
      { method: "DELETE" },
    ),
  updateAssignmentCollaboration: (
    assignmentId: string,
    input: {
      collaborationMode?: "INDIVIDUAL" | "GROUP";
      groupMinMembers?: number;
      groupMaxMembers?: number;
      maxResubmissions?: number;
    },
  ) =>
    apiRequest<{ id: string }>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}/collaboration`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  getPeerReviewConfig: (assignmentId: string) =>
    apiRequest<PeerReviewConfig | null>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}/peer-review/config`,
    ),
  upsertPeerReviewConfig: (
    assignmentId: string,
    input: Record<string, unknown>,
    method: "POST" | "PATCH" = "POST",
  ) =>
    apiRequest<PeerReviewConfig>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}/peer-review/config`,
      {
        method,
        body: JSON.stringify(input),
      },
    ),
  generatePeerReviewMatches: (assignmentId: string) =>
    apiRequest<{ configId: string; count: number; matches: Array<{ matchId: string; submissionId: string; reviewerUserId: string }> }>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}/peer-review/generate-matches`,
      { method: "POST" },
    ),
  listPeerReviewMatches: (assignmentId: string) =>
    apiRequest<PeerReviewMatch[]>(
      `/instructor/assignments/${encodeURIComponent(assignmentId)}/peer-review/matches`,
    ),
  listSubmissionAnnotations: (submissionId: string) =>
    apiRequest<SubmissionAnnotation[]>(
      `/instructor/submissions/${encodeURIComponent(submissionId)}/annotations`,
    ),
  createSubmissionAnnotation: (
    submissionId: string,
    input: {
      startOffset: number;
      endOffset: number;
      selectedText: string;
      comment: string;
    },
  ) =>
    apiRequest<SubmissionAnnotation>(
      `/instructor/submissions/${encodeURIComponent(submissionId)}/annotations`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  updateSubmissionAnnotation: (
    submissionId: string,
    annotationId: string,
    input: { comment?: string; resolved?: boolean },
  ) =>
    apiRequest<SubmissionAnnotation>(
      `/instructor/submissions/${encodeURIComponent(submissionId)}/annotations/${annotationId}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  deleteSubmissionAnnotation: (submissionId: string, annotationId: string) =>
    apiRequest<{ id: string }>(
      `/instructor/submissions/${encodeURIComponent(submissionId)}/annotations/${annotationId}`,
      { method: "DELETE" },
    ),
  listPlagiarismChecks: (submissionId: string) =>
    apiRequest<PlagiarismCheck[]>(
      `/instructor/submissions/${encodeURIComponent(submissionId)}/plagiarism-checks`,
    ),
  runPlagiarismCheck: (
    submissionId: string,
    input: { provider?: string } = {},
  ) =>
    apiRequest<PlagiarismCheck>(
      `/instructor/submissions/${encodeURIComponent(submissionId)}/plagiarism-checks`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  listCourseShowcases: (courseId: string) =>
    apiRequest<ProjectShowcase[]>(
      `/instructor/courses/${encodeURIComponent(courseId)}/showcases`,
    ),
  createCourseShowcase: (
    courseId: string,
    input: {
      submissionId: string;
      title: string;
      summary?: string;
      thumbnailUrl?: string;
      externalUrl?: string;
      publish?: boolean;
    },
  ) =>
    apiRequest<ProjectShowcase>(
      `/instructor/courses/${encodeURIComponent(courseId)}/showcases`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  updateCourseShowcase: (
    showcaseId: string,
    input: Record<string, unknown>,
  ) =>
    apiRequest<ProjectShowcase>(
      `/instructor/showcases/${encodeURIComponent(showcaseId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  deleteCourseShowcase: (showcaseId: string) =>
    apiRequest<{ id: string }>(
      `/instructor/showcases/${encodeURIComponent(showcaseId)}`,
      { method: "DELETE" },
    ),
  // Learner
  listLearnerPeerReviews: () => apiRequest<PeerReviewMatch[]>("/learn/peer-reviews"),
  submitLearnerPeerReview: (
    matchId: string,
    input: { overallScore?: number; feedback?: string; rubricScores?: PeerReviewRubricScore[] },
  ) =>
    apiRequest<PeerReview>(
      `/learn/peer-reviews/matches/${encodeURIComponent(matchId)}/submit`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  getMyPortfolio: () => apiRequest<Portfolio>("/learn/portfolio"),
  updateMyPortfolio: (input: { title?: string; description?: string; isPublic?: boolean }) =>
    apiRequest<Portfolio>("/learn/portfolio", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  addPortfolioEntry: (input: {
    title: string;
    description?: string;
    submissionId?: string;
    showcaseId?: string;
    orderIndex?: number;
  }) =>
    apiRequest<PortfolioEntry>("/learn/portfolio/entries", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updatePortfolioEntry: (
    entryId: string,
    input: { title?: string; description?: string; orderIndex?: number },
  ) =>
    apiRequest<PortfolioEntry>(
      `/learn/portfolio/entries/${encodeURIComponent(entryId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  removePortfolioEntry: (entryId: string) =>
    apiRequest<{ id: string }>(
      `/learn/portfolio/entries/${encodeURIComponent(entryId)}`,
      { method: "DELETE" },
    ),
  getPublicPortfolio: (shareToken: string) =>
    apiRequest<Portfolio>(
      `/public/portfolios/${encodeURIComponent(shareToken)}`,
    ),
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
  signedFileUrl: (fileId: string, expiresInSeconds = 300) =>
    apiRequest<{ url: string; expiresInSeconds: number }>(
      `/files/${encodeURIComponent(fileId)}/signed-url`,
      {
        method: "POST",
        body: JSON.stringify({ expiresInSeconds }),
      },
    ),
  contentLibrary: () => apiRequest<ContentLibraryItem[]>("/content-library"),
  createContentLibraryItem: (input: Record<string, unknown>) =>
    apiRequest<ContentLibraryItem>("/content-library", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deleteContentLibraryItem: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/content-library/${encodeURIComponent(id)}`, {
      method: "DELETE",
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

  // Phase 24: Realtime Gateway
  realtimeTransports: () =>
    apiRequest<{ data: RealtimeTransportInfo }>("/realtime/transports"),
  buildRealtimeChannel: (entity: string, entityId: string) =>
    apiRequest<{ data: { channel: string } }>(
      `/realtime/channels/org/${encodeURIComponent(entity)}/${encodeURIComponent(entityId)}`,
    ),

  // ── Phase 21: Data Governance & Backup ──────────────────
  listLegalDocuments: (query?: { type?: LegalDocumentType }) =>
    apiRequest<{ data: LegalDocument[] }>(
      `/governance/legal-documents${query?.type ? `?type=${query.type}` : ""}`,
    ),
  getLatestLegalDocuments: () =>
    apiRequest<{ data: LegalDocument[] }>(
      "/governance/legal-documents/latest",
    ),
  recordConsent: (input: {
    documentType: LegalDocumentType;
    documentVersion: string;
    documentId?: string;
  }) =>
    apiRequest<{ data: ConsentRecord }>("/governance/consent", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listMyConsents: () =>
    apiRequest<{ data: ConsentRecord[] }>("/governance/my-consents"),
  recordCookieConsent: (input: {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences?: boolean;
    sessionId: string;
  }) =>
    apiRequest<{ data: unknown }>("/governance/cookie-consent", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  requestDataExport: (reason?: string) =>
    apiRequest<{ data: DataExportRequest }>("/governance/data-export", {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  previewDataExport: () =>
    apiRequest<{ data: unknown }>("/governance/data-export/preview"),
  requestAnonymization: (input: { confirm: boolean; reason?: string }) =>
    apiRequest<{ data: AnonymizationRequest }>("/governance/anonymize-me", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  // Admin
  createLegalDocument: (input: {
    type: LegalDocumentType;
    version: string;
    title: string;
    content: string;
    effectiveAt: string;
    publish?: boolean;
  }) =>
    apiRequest<{ data: LegalDocument }>(
      "/governance/admin/legal-documents",
      { method: "POST", body: JSON.stringify(input) },
    ),
  updateLegalDocument: (
    documentId: string,
    input: {
      title?: string;
      content?: string;
      effectiveAt?: string;
      publish?: boolean;
    },
  ) =>
    apiRequest<{ data: LegalDocument }>(
      `/governance/admin/legal-documents/${documentId}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  listDataExportRequests: () =>
    apiRequest<{ data: DataExportRequest[] }>(
      "/governance/admin/data-export-requests",
    ),
  listRetentionPolicies: () =>
    apiRequest<{ data: RetentionPolicy[] }>(
      "/governance/admin/retention-policies",
    ),
  upsertRetentionPolicy: (input: {
    entityType: string;
    retentionDays: number;
    anonymize?: boolean;
    description?: string;
  }) =>
    apiRequest<{ data: RetentionPolicy }>(
      "/governance/admin/retention-policies",
      { method: "POST", body: JSON.stringify(input) },
    ),
  listBackupJobs: () =>
    apiRequest<{ data: BackupJob[] }>("/governance/admin/backup-jobs"),
  triggerBackupJob: (input: { type: "FULL" | "INCREMENTAL"; notes?: string }) =>
    apiRequest<{ data: BackupJob }>("/governance/admin/backup-jobs", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ── Phase 22: OAuth, Captcha, MFA ──────────────────
  startOAuth: (provider: OAuthProvider, redirectUri?: string) =>
    apiRequest<{ data: { authorizeUrl: string; state: string } }>(
      `/auth/oauth/${provider.toLowerCase()}/start`,
      {
        method: "POST",
        body: JSON.stringify({ redirectUri }),
      },
    ),
  finishOAuth: (
    provider: OAuthProvider,
    code: string,
    state: string,
  ) =>
    apiRequest<{
      data:
        | { account: OAuthAccount; user: { id: string; email: string; name?: string | null }; linked: true }
        | { profile: { provider: OAuthProvider; providerUserId: string; email: string; name: string; raw: Record<string, unknown> } };
    }>(`/auth/oauth/${provider.toLowerCase()}/callback`, {
      method: "POST",
      body: JSON.stringify({ code, state }),
    }),
  listOAuthAccounts: () =>
    apiRequest<{ data: OAuthAccount[] }>("/auth/oauth/accounts"),
  linkOAuthAccount: (input: {
    provider: OAuthProvider;
    profile: {
      providerUserId: string;
      email?: string;
      raw?: Record<string, unknown>;
    };
  }) =>
    apiRequest<{ data: OAuthAccount }>("/auth/oauth/accounts/link", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  unlinkOAuthAccount: (id: string) =>
    apiRequest<{ data: { id: string } }>(`/auth/oauth/accounts/${id}`, {
      method: "DELETE",
    }),
  listMfaFactors: () =>
    apiRequest<{ data: MfaFactor[] }>("/auth/mfa"),
  enrollMfa: (type: "TOTP" | "BACKUP_CODE") =>
    apiRequest<{ data: MfaEnrollmentChallenge }>("/auth/mfa/enroll", {
      method: "POST",
      body: JSON.stringify({ type }),
    }),
  verifyMfa: (code: string) =>
    apiRequest<{
      data: { valid: boolean; type: "TOTP" | "BACKUP_CODE"; remainingCodes?: number };
    }>("/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  disableMfa: (type: "TOTP" | "BACKUP_CODE") =>
    apiRequest<{ data: { removed: number } }>("/auth/mfa/disable", {
      method: "DELETE",
      body: JSON.stringify({ type }),
    }),
  listSessions: () =>
    apiRequest<{ data: RefreshSessionEntry[] }>("/auth/sessions"),
  revokeSession: (id: string) =>
    apiRequest<{ data: { id: string } }>(`/auth/sessions/${id}`, {
      method: "DELETE",
    }),
  revokeAllSessions: () =>
    apiRequest<{ data: { revoked: number } }>("/auth/sessions", {
      method: "DELETE",
    }),

  // ── Phase 26: Moderation ──────────────────
  submitReport: (input: {
    targetType: ModerationTargetType;
    targetId: string;
    reason: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }) =>
    apiRequest<{ data: ModerationReport }>("/moderation/reports", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listModerationReports: (query?: {
    targetType?: ModerationTargetType;
    status?: ModerationReportStatus;
  }) => {
    const params = new URLSearchParams();
    if (query?.targetType) params.set("targetType", query.targetType);
    if (query?.status) params.set("status", query.status);
    const qs = params.toString();
    return apiRequest<{ data: ModerationReport[] }>(
      `/admin/moderation/reports${qs ? `?${qs}` : ""}`,
    );
  },
  updateModerationReport: (
    id: string,
    input: { status?: ModerationReportStatus; resolution?: string },
  ) =>
    apiRequest<{ data: ModerationReport }>(
      `/admin/moderation/reports/${id}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  listModerationActions: () =>
    apiRequest<{ data: ModerationAction[] }>("/admin/moderation/actions"),
  createModerationAction: (input: {
    targetType: ModerationTargetType;
    targetId: string;
    actionType: ModerationActionType;
    reason: string;
    notes?: string;
  }) =>
    apiRequest<{ data: ModerationAction }>("/admin/moderation/actions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listContentFlags: () =>
    apiRequest<{ data: ContentFlag[] }>("/admin/moderation/flags"),
  pollRealtime: (params: { channel?: string; since?: string; order?: "asc" | "desc"; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.channel) search.set("channel", params.channel);
    if (params.since) search.set("since", params.since);
    if (params.order) search.set("order", params.order);
    if (params.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiRequest<RealtimePollResult>(
      `/realtime/poll${query ? `?${query}` : ""}`,
    );
  },
  publishRealtime: (input: { channel: string; type: string; payload?: Record<string, unknown> }) =>
    apiRequest<{ data: RealtimeEvent }>("/realtime/publish", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  subscribeRealtime: (channel: string) =>
    apiRequest(`/realtime/subscribe`, {
      method: "POST",
      body: JSON.stringify({ channel }),
    }),
  unsubscribeRealtime: (channel: string) =>
    apiRequest(`/realtime/subscribe`, {
      method: "DELETE",
      body: JSON.stringify({ channel }),
    }),
  ackRealtime: (channel: string, eventId: string) =>
    apiRequest(`/realtime/ack`, {
      method: "POST",
      body: JSON.stringify({ channel, eventId }),
    }),

  // Phase 25: Bulk Operations
  listBulkJobs: (params: { type?: string; status?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.type) search.set("type", params.type);
    if (params.status) search.set("status", params.status);
    const query = search.toString();
    return apiRequest<{ data: BulkJob[] }>(
      `/admin/bulk/jobs${query ? `?${query}` : ""}`,
    );
  },
  getBulkJob: (id: string) =>
    apiRequest<{ data: BulkJob }>(`/admin/bulk/jobs/${encodeURIComponent(id)}`),
  createBulkJob: (input: CreateBulkJobInput) =>
    apiRequest<CreateBulkJobResult>("/admin/bulk/jobs", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  cancelBulkJob: (id: string, reason: string) =>
    apiRequest<{ data: BulkJob }>(
      `/admin/bulk/jobs/${encodeURIComponent(id)}/cancel`,
      { method: "POST", body: JSON.stringify({ reason }) },
    ),
  resumeBulkJob: (id: string) =>
    apiRequest<{ data: { resumed: boolean; id: string } }>(
      `/admin/bulk/jobs/${encodeURIComponent(id)}/resume`,
      { method: "POST" },
    ),

  // Phase 27: Direct Messaging
  listConversations: () => apiRequest<{ data: Conversation[] }>("/messages/conversations"),
  getConversation: (id: string) =>
    apiRequest<{ data: Conversation }>(`/messages/conversations/${encodeURIComponent(id)}`),
  createConversation: (input: CreateConversationInput) =>
    apiRequest<{ data: Conversation }>("/messages/conversations", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  addConversationMembers: (id: string, userIds: string[]) =>
    apiRequest<{ data: Conversation }>(
      `/messages/conversations/${encodeURIComponent(id)}/members`,
      { method: "POST", body: JSON.stringify({ userIds }) },
    ),
  listMessages: (id: string, params: { cursor?: string; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.cursor) search.set("cursor", params.cursor);
    if (params.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiRequest<{ data: ChatMessage[] }>(
      `/messages/conversations/${encodeURIComponent(id)}/messages${query ? `?${query}` : ""}`,
    );
  },
  sendMessage: (id: string, input: SendMessageInput) =>
    apiRequest<{ data: ChatMessage }>(
      `/messages/conversations/${encodeURIComponent(id)}/messages`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  editMessage: (messageId: string, content: string) =>
    apiRequest<{ data: ChatMessage }>(
      `/messages/messages/${encodeURIComponent(messageId)}`,
      { method: "PATCH", body: JSON.stringify({ content }) },
    ),
  deleteMessage: (messageId: string) =>
    apiRequest<{ data: ChatMessage }>(
      `/messages/messages/${encodeURIComponent(messageId)}`,
      { method: "DELETE" },
    ),
  reactMessage: (messageId: string, emoji: string) =>
    apiRequest<{ data: { id?: string; removed?: boolean } }>(
      `/messages/messages/${encodeURIComponent(messageId)}/reactions`,
      { method: "POST", body: JSON.stringify({ emoji }) },
    ),
  markConversationRead: (id: string, messageId?: string) =>
    apiRequest<{ data: { readAt: string; conversationId: string } }>(
      `/messages/conversations/${encodeURIComponent(id)}/read`,
      { method: "POST", body: JSON.stringify({ messageId }) },
    ),
  blockUser: (userId: string) =>
    apiRequest(`/messages/blocks`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  unblockUser: (userId: string) =>
    apiRequest(`/messages/blocks/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),

  // ── Phase 19: Global Search ────────────────────────
  globalSearch: (q: string, options: { types?: SearchEntityType[]; courseId?: string; limit?: number } = {}) => {
    const search = new URLSearchParams();
    search.set("q", q);
    if (options.types && options.types.length) {
      search.set("types", options.types.join(","));
    }
    if (options.courseId) search.set("courseId", options.courseId);
    if (options.limit) search.set("limit", String(options.limit));
    return apiRequest<GlobalSearchResult>(`/search?${search.toString()}`);
  },
  searchAnalytics: (params: { days?: number; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.days) search.set("days", String(params.days));
    if (params.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiRequest<SearchAnalytics>(`/admin/search/analytics${query ? `?${query}` : ""}`);
  },

  // ── Phase 20: Localization ──────────────────────────
  getLocalePreference: () => apiRequest<UserLocalePreference>("/locale/preferences"),
  updateLocalePreference: (input: Partial<UserLocalePreference>) =>
    apiRequest<UserLocalePreference>("/locale/preferences", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  resolveLocale: () =>
    apiRequest<{ locale: string; supportedLocales: string[]; fallbackChain: string[]; timezone: string }>(
      "/locale/resolve",
    ),
  getOrgLocalePreference: () => apiRequest<OrgLocalePreference>("/admin/locale/preferences"),
  updateOrgLocalePreference: (input: Partial<OrgLocalePreference>) =>
    apiRequest<OrgLocalePreference>("/admin/locale/preferences", {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  // ── Phase 20: Help Center ──────────────────────────
  listHelpCategories: () => apiRequest<HelpCategory[]>("/help/categories"),
  listHelpArticles: (params: { q?: string; categoryId?: string; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.categoryId) search.set("categoryId", params.categoryId);
    if (params.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiRequest<HelpArticle[]>(`/help/articles${query ? `?${query}` : ""}`);
  },
  getHelpArticle: (id: string) =>
    apiRequest<HelpArticle>(`/help/articles/${encodeURIComponent(id)}`),
  createHelpArticle: (input: {
    categoryId: string;
    slug: string;
    title: string;
    body: string;
    excerpt?: string;
    tags?: string[];
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  }) =>
    apiRequest<HelpArticle>("/admin/help/articles", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateHelpArticle: (id: string, input: Partial<{
    categoryId: string;
    slug: string;
    title: string;
    body: string;
    excerpt: string;
    tags: string[];
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  }>) =>
    apiRequest<HelpArticle>(`/admin/help/articles/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteHelpArticle: (id: string) =>
    apiRequest<{ id: string }>(`/admin/help/articles/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  createHelpCategory: (input: { key: string; title: string; description?: string; icon?: string; orderIndex?: number }) =>
    apiRequest<HelpCategory>("/admin/help/categories", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ── Phase 20: Support Tickets ──────────────────────
  listSupportTickets: (params: { status?: string; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.status) search.set("status", params.status);
    if (params.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiRequest<SupportTicket[]>(`/support/tickets${query ? `?${query}` : ""}`);
  },
  getSupportTicket: (id: string) =>
    apiRequest<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}`),
  createSupportTicket: (input: { subject: string; body: string; category?: string; priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" }) =>
    apiRequest<SupportTicket>("/support/tickets", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  replySupportTicket: (id: string, body: string, isInternal = false) =>
    apiRequest<SupportTicketReply>(`/support/tickets/${encodeURIComponent(id)}/replies`, {
      method: "POST",
      body: JSON.stringify({ body, isInternal }),
    }),
  updateSupportTicket: (id: string, input: { status?: string; priority?: string; assignedToId?: string }) =>
    apiRequest<SupportTicket>(`/admin/support/tickets/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  // ── Phase 35: Transcript Notes ─────────────────────
  listTranscriptNotes: (params: { lessonId?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.lessonId) search.set("lessonId", params.lessonId);
    const query = search.toString();
    return apiRequest<TranscriptNote[]>(`/learn/notes${query ? `?${query}` : ""}`);
  },
  searchTranscriptNotes: (params: { q?: string; lessonId?: string; activityId?: string; tags?: string[]; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.lessonId) search.set("lessonId", params.lessonId);
    if (params.activityId) search.set("activityId", params.activityId);
    if (params.tags && params.tags.length) search.set("tags", params.tags.join(","));
    if (params.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiRequest<TranscriptNote[]>(`/learn/notes/search${query ? `?${query}` : ""}`);
  },
  createTranscriptNote: (input: {
    lessonId: string;
    activityId?: string;
    timestampSeconds?: number;
    content: string;
    color?: "yellow" | "green" | "blue" | "pink" | "purple";
    tags?: string[];
  }) =>
    apiRequest<TranscriptNote>("/learn/notes", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateTranscriptNote: (id: string, input: Partial<{
    content: string;
    color: "yellow" | "green" | "blue" | "pink" | "purple";
    tags: string[];
    timestampSeconds: number;
  }>) =>
    apiRequest<TranscriptNote>(`/learn/notes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteTranscriptNote: (id: string) =>
    apiRequest<{ id: string }>(`/learn/notes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  generateNoteContext: (id: string, input: { providerKey?: string; candidateNoteIds?: string[] } = {}) =>
    apiRequest<NoteContext>(`/learn/notes/${encodeURIComponent(id)}/context`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getNoteContext: (id: string) =>
    apiRequest<NoteContext | null>(`/learn/notes/${encodeURIComponent(id)}/context`),
  exportTranscriptNotes: (input: { lessonId?: string } = {}) =>
    apiRequest<NoteExportResult>("/learn/notes/export", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // Phase 31: 3D Content Plugin
  listThreeDAssets: (params: { search?: string; format?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.format) query.set("format", params.format);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<ThreeDAssetRecord[]>(`/content-3d/assets${suffix}`);
  },
  getThreeDAsset: (id: string) =>
    apiRequest<ThreeDAssetRecord>(`/content-3d/assets/${encodeURIComponent(id)}`),
  createThreeDAsset: (input: {
    name: string;
    format: "GLB" | "GLTF" | "FBX" | "OBJ";
    sizeBytes?: number;
    url: string;
    thumbnailUrl?: string;
  }) =>
    apiRequest<ThreeDAssetRecord>("/content-3d/assets", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateThreeDAsset: (
    id: string,
    input: Partial<{
      name: string;
      format: "GLB" | "GLTF" | "FBX" | "OBJ";
      sizeBytes: number;
      url: string;
      thumbnailUrl: string;
    }>,
  ) =>
    apiRequest<ThreeDAssetRecord>(`/content-3d/assets/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteThreeDAsset: (id: string) =>
    apiRequest<{ deleted: boolean; id: string }>(
      `/content-3d/assets/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  generateThreeDPreview: (id: string) =>
    apiRequest<ThreeDAssetRecord>(
      `/content-3d/assets/${encodeURIComponent(id)}/preview`,
      { method: "POST" },
    ),
  listThreeDScenes: (assetId: string) =>
    apiRequest<ThreeDSceneRecord[]>(
      `/content-3d/assets/${encodeURIComponent(assetId)}/scenes`,
    ),
  createThreeDScene: (
    assetId: string,
    input: { scene: Record<string, unknown>; version?: number },
  ) =>
    apiRequest<ThreeDSceneRecord>(
      `/content-3d/assets/${encodeURIComponent(assetId)}/scenes`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  getThreeDScene: (id: string) =>
    apiRequest<ThreeDSceneRecord>(`/content-3d/scenes/${encodeURIComponent(id)}`),
  addThreeDInteraction: (
    sceneId: string,
    input: { name: string; trigger: string; action: Record<string, unknown> },
  ) =>
    apiRequest<ThreeDInteractionRecord>(
      `/content-3d/scenes/${encodeURIComponent(sceneId)}/interactions`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  // Phase 32: Code Runner Plugin
  executeCode: (input: {
    language: CodeLanguage;
    code: string;
    stdin?: string;
    timeoutMs?: number;
  }) =>
    apiRequest<CodeExecutionRecord & { sandboxStatus: string }>(
      "/code-runner/execute",
      { method: "POST", body: JSON.stringify(input) },
    ),
  judgeCode: (input: {
    assignmentId: string;
    language: CodeLanguage;
    code: string;
    testCases: Array<{ name: string; input?: string; expectedOutput: string }>;
    timeoutMs?: number;
    scoreWeight?: number;
  }) =>
    apiRequest<CodeJudgeResult>("/code-runner/judge", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listCodeSubmissions: (params: { assignmentId?: string; userId?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.assignmentId) query.set("assignmentId", params.assignmentId);
    if (params.userId) query.set("userId", params.userId);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<CodeSubmissionRecord[]>(
      `/code-runner/submissions${suffix}`,
    );
  },
  getCodeExecution: (id: string) =>
    apiRequest<CodeExecutionRecord>(
      `/code-runner/executions/${encodeURIComponent(id)}`,
    ),

  // Phase 33: Plugin Marketplace Governance
  listPluginListings: (status?: string) =>
    apiRequest<PluginListingRecord[]>(
      `/admin/plugin-marketplace/listings${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    ),
  getPluginListing: (id: string) =>
    apiRequest<PluginListingRecord>(
      `/admin/plugin-marketplace/listings/${encodeURIComponent(id)}`,
    ),
  createPluginListing: (input: {
    pluginId: string;
    name: string;
    description: string;
    longDescription?: string;
    categories?: string[];
    screenshots?: string[];
    pricing?: Record<string, unknown>;
  }) =>
    apiRequest<PluginListingRecord>("/admin/plugin-marketplace/listings", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updatePluginListing: (
    id: string,
    input: Partial<{
      name: string;
      description: string;
      longDescription: string;
      categories: string[];
      screenshots: string[];
      pricing: Record<string, unknown>;
    }>,
  ) =>
    apiRequest<PluginListingRecord>(
      `/admin/plugin-marketplace/listings/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  updatePluginListingStatus: (
    id: string,
    status: PluginListingStatus,
  ) =>
    apiRequest<PluginListingRecord>(
      `/admin/plugin-marketplace/listings/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    ),
  listPluginReviews: (listingId?: string) =>
    apiRequest<Array<PluginReviewRecord & { reviewer: { id: string; name: string; email: string }; listing: { id: string; name: string } }>>(
      `/admin/plugin-marketplace/reviews${listingId ? `?listingId=${encodeURIComponent(listingId)}` : ""}`,
    ),
  createPluginReview: (input: {
    listingId: string;
    rating: number;
    comment?: string;
  }) =>
    apiRequest<PluginReviewRecord>("/admin/plugin-marketplace/reviews", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updatePluginReviewStatus: (id: string, status: PluginReviewStatus) =>
    apiRequest<PluginReviewRecord>(
      `/admin/plugin-marketplace/reviews/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    ),
  listPluginInstallations: () =>
    apiRequest<PluginInstallationRecord[]>(
      "/admin/plugin-marketplace/installations",
    ),
  installPlugin: (input: { listingId: string; config?: Record<string, unknown> }) =>
    apiRequest<PluginInstallationRecord>(
      "/admin/plugin-marketplace/installations",
      { method: "POST", body: JSON.stringify(input) },
    ),
  uninstallPlugin: (id: string) =>
    apiRequest<{ deleted: boolean; id: string }>(
      `/admin/plugin-marketplace/installations/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  getPluginPolicy: () =>
    apiRequest<PluginPolicyRecord>("/admin/plugin-marketplace/policy"),
  updatePluginPolicy: (input: {
    maxInstalls?: number;
    allowedCategories?: string[];
    requireApproval?: boolean;
  }) =>
    apiRequest<PluginPolicyRecord>("/admin/plugin-marketplace/policy", {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  // Phase 34: Popout Dual Monitor
  issuePopoutToken: (input: { lessonId: string; ttlMs?: number }) =>
    apiRequest<PopoutSessionResponse>("/popout/issue", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  validatePopoutToken: (token: string) =>
    apiRequest<PopoutValidationResponse>(
      `/popout/validate/${encodeURIComponent(token)}`,
    ),
  revokePopoutToken: (token: string) =>
    apiRequest<{ revoked: boolean; id: string }>(
      `/popout/${encodeURIComponent(token)}`,
      { method: "DELETE" },
    ),

  // Phase 36: Plugin Workspace Panels
  listAvailablePanels: () =>
    apiRequest<PluginPanelDefinition[]>("/plugin-panels/available"),
  registerPluginPanel: (input: {
    pluginId: string;
    panelKey: string;
    name: string;
    defaultSize?: PanelSize;
    defaultPosition?: PanelPosition;
    allowedRoutes?: string[];
    configSchema?: Record<string, unknown>;
  }) =>
    apiRequest<PluginPanelDefinition>("/plugin-panels/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getPanelLayout: (layoutKey: string) =>
    apiRequest<UserPanelLayoutRecord>(
      `/me/panel-layouts/${encodeURIComponent(layoutKey)}`,
    ),
  savePanelLayout: (
    layoutKey: string,
    input: { panels: PanelEntry[] },
  ) =>
    apiRequest<UserPanelLayoutRecord>(
      `/me/panel-layouts/${encodeURIComponent(layoutKey)}`,
      { method: "PUT", body: JSON.stringify(input) },
    ),

  // Phase 23: Cohorts, Schedules & Timezones
  listCohorts: (params: { courseId?: string; status?: Cohort["status"] } = {}) => {
    const query = new URLSearchParams();
    if (params.courseId) query.set("courseId", params.courseId);
    if (params.status) query.set("status", params.status);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<Cohort[]>(`/admin/cohorts${suffix}`);
  },
  listMyCohorts: () => apiRequest<Cohort[]>("/learn/cohorts"),
  getCohort: (id: string) =>
    apiRequest<Cohort>(`/admin/cohorts/${encodeURIComponent(id)}`),
  createCohort: (input: {
    name: string;
    courseId: string;
    startAt: string;
    endAt: string;
    timezone?: string;
    maxSeats?: number;
    status?: Cohort["status"];
  }) =>
    apiRequest<Cohort>("/admin/cohorts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateCohort: (
    id: string,
    input: Partial<{
      name: string;
      startAt: string;
      endAt: string;
      timezone: string;
      maxSeats: number;
      status: Cohort["status"];
    }>,
  ) =>
    apiRequest<Cohort>(`/admin/cohorts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteCohort: (id: string) =>
    apiRequest<{ id: string }>(`/admin/cohorts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  addCohortMember: (
    cohortId: string,
    input: { userId: string; status?: CohortMember["status"] },
  ) =>
    apiRequest<CohortMember>(
      `/admin/cohorts/${encodeURIComponent(cohortId)}/members`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  removeCohortMember: (cohortId: string, userId: string) =>
    apiRequest<{ id: string }>(
      `/admin/cohorts/${encodeURIComponent(cohortId)}/members/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    ),
  listCohortSchedule: (cohortId: string) =>
    apiRequest<CohortSchedule[]>(
      `/admin/cohorts/${encodeURIComponent(cohortId)}/schedule`,
    ),
  addCohortSchedule: (
    cohortId: string,
    input: {
      weekday: number;
      startTime: string;
      endTime: string;
      lessonId?: string;
      meetingUrl?: string;
    },
  ) =>
    apiRequest<CohortSchedule>(
      `/admin/cohorts/${encodeURIComponent(cohortId)}/schedule`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  bulkAddCohortSchedule: (
    cohortId: string,
    items: Array<{
      weekday: number;
      startTime: string;
      endTime: string;
      lessonId?: string;
      meetingUrl?: string;
    }>,
  ) =>
    apiRequest<CohortSchedule[]>(
      `/admin/cohorts/${encodeURIComponent(cohortId)}/schedule/bulk`,
      { method: "POST", body: JSON.stringify({ items }) },
    ),
  getMyTimezone: () => apiRequest<UserTimezonePreference>("/me/timezone"),
  updateMyTimezone: (input: { timezone: string; autoDetect?: boolean }) =>
    apiRequest<UserTimezonePreference>("/me/timezone", {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  // Phase 28: Proctoring
  startProctoringSession: (input: {
    attemptId: string;
    attemptType?: string;
    metadata?: Record<string, unknown>;
  }) =>
    apiRequest<ProctoringSession>("/proctoring/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getProctoringSession: (id: string) =>
    apiRequest<ProctoringSession>(
      `/proctoring/sessions/${encodeURIComponent(id)}`,
    ),
  ingestProctoringEvent: (
    sessionId: string,
    input: {
      type: ProctoringEventType;
      severity?: ProctoringSeverity;
      metadata?: Record<string, unknown>;
    },
  ) =>
    apiRequest<ProctoringEvent>(
      `/proctoring/sessions/${encodeURIComponent(sessionId)}/events`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  ingestProctoringEventBatch: (
    sessionId: string,
    events: Array<{
      type: ProctoringEventType;
      severity?: ProctoringSeverity;
      metadata?: Record<string, unknown>;
    }>,
  ) =>
    apiRequest<ProctoringEvent[]>(
      `/proctoring/sessions/${encodeURIComponent(sessionId)}/events/batch`,
      { method: "POST", body: JSON.stringify({ events }) },
    ),
  endProctoringSession: (sessionId: string) =>
    apiRequest<ProctoringSession>(
      `/proctoring/sessions/${encodeURIComponent(sessionId)}/end`,
      { method: "POST" },
    ),
  listProctoringSessions: (params: { userId?: string; status?: ProctoringSession["status"] } = {}) => {
    const query = new URLSearchParams();
    if (params.userId) query.set("userId", params.userId);
    if (params.status) query.set("status", params.status);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<ProctoringSession[]>(
      `/admin/proctoring/sessions${suffix}`,
    );
  },
  listProctoringFlags: (params: { status?: ProctoringFlagStatus; sessionId?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.sessionId) query.set("sessionId", params.sessionId);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<ProctoringFlag[]>(`/admin/proctoring/flags${suffix}`);
  },
  reviewProctoringFlag: (
    flagId: string,
    input: { status: ProctoringFlagStatus; notes?: string },
  ) =>
    apiRequest<ProctoringFlag>(
      `/admin/proctoring/flags/${encodeURIComponent(flagId)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),

  // Phase 29: Revenue Share & Payouts
  listRevenueShareRules: () =>
    apiRequest<RevenueShareRule[]>("/admin/payouts/rules"),
  createRevenueShareRule: (input: {
    scope: RevenueShareScope;
    targetId?: string;
    percent: number;
    active?: boolean;
  }) =>
    apiRequest<RevenueShareRule>("/admin/payouts/rules", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateRevenueShareRule: (
    id: string,
    input: { percent?: number; active?: boolean },
  ) =>
    apiRequest<RevenueShareRule>(
      `/admin/payouts/rules/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  listPayoutMethods: () =>
    apiRequest<PayoutMethod[]>("/admin/payouts/methods"),
  createPayoutMethod: (input: {
    beneficiaryType: PayoutBeneficiaryType;
    beneficiaryId: string;
    type: PayoutMethodType;
    details: Record<string, unknown>;
  }) =>
    apiRequest<PayoutMethod>("/admin/payouts/methods", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listPayoutPeriods: () =>
    apiRequest<PayoutPeriod[]>("/admin/payouts/periods"),
  createPayoutPeriod: (input: {
    periodStart: string;
    periodEnd: string;
    currency?: string;
  }) =>
    apiRequest<PayoutPeriod>("/admin/payouts/periods", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  computePayoutPeriod: (periodId: string) =>
    apiRequest<PayoutPeriod>(
      `/admin/payouts/periods/${encodeURIComponent(periodId)}/compute`,
      { method: "POST" },
    ),
  lockPayoutPeriod: (periodId: string) =>
    apiRequest<PayoutPeriod>(
      `/admin/payouts/periods/${encodeURIComponent(periodId)}/lock`,
      { method: "POST" },
    ),
  payPayoutPeriod: (periodId: string, input: { reference?: string }) =>
    apiRequest<PayoutPeriod>(
      `/admin/payouts/periods/${encodeURIComponent(periodId)}/pay`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  listMyPayouts: () => apiRequest<Payout[]>("/payouts/me"),

  // Phase 30: Tax Regions & Rules
  listTaxRegions: () => apiRequest<TaxRegion[]>("/tax/regions"),
  listTaxRules: () => apiRequest<TaxRule[]>("/admin/tax/rules"),
  createTaxRule: (input: {
    regionCode: string;
    rate: number;
    type: TaxRuleType;
    inclusive?: boolean;
    active?: boolean;
  }) =>
    apiRequest<TaxRule>("/admin/tax/rules", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateTaxRule: (
    id: string,
    input: { rate?: number; inclusive?: boolean; active?: boolean },
  ) =>
    apiRequest<TaxRule>(
      `/admin/tax/rules/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  calculateTax: (input: {
    subtotal: number;
    regionCode: string;
    currency: SupportedCurrency;
    lines?: Array<{
      productId: string;
      amount: number;
      metadata?: Record<string, unknown>;
    }>;
  }) =>
    apiRequest<TaxCalculation>("/tax/calculate", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
