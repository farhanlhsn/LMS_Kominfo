"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  ApiClientError,
  clearSession,
  getSession,
  setSession,
} from "./api-client";
import type {
  ActivityContentResponse,
  AdminOverview,
  Achievement,
  AiGeneratedItem,
  AiStatus,
  AiTutorResponse,
  ApiKey,
  Assignment,
  AssignmentSubmission,
  AuditLogEntry,
  AuthSession,
  Branding,
  Certificate,
  CertificateTemplate,
  CertificateVerification,
  Coupon,
  ContentLibraryItem,
  Course,
  DailyTrend,
  Enrollment,
  FavoriteInstructor,
  FileAsset,
  InstructorDashboard,
  LeaderboardEntry,
  LearnerBookmark,
  LearnerAssignmentResponse,
  LearnerCourseProgress,
  LearnerDashboard,
  LearnerGrades,
  LearnerStreak,
  StudySession,
  LearningGoal,
  LearningPath,
  LearningPathEnrollment,
  LearnerNote,
  LearningCourseResponse,
  LearningWorkspacePreference,
  Lesson,
  LessonWorkspaceState,
  LoginPolicy,
  NotesExport,
  OrganizationMemberRecord,
  OrganizationRoleRecord,
  Order,
  OrgDomain,
  Plugin,
  PluginActivityType,
  PluginExecutionLog,
  Question,
  QuestionBank,
  Quiz,
  QuizAttempt,
  RecentlyViewedCourse,
  LearnerQuizResponse,
  TranscriptSegment,
  VideoCaptionTrack,
  WorkspaceContext,
  Rubric,
  Skill,
  SsoProvider,
  SubscriptionPlan,
  UserAchievement,
  UserSkill,
  UserSubscription,
  WebhookEndpoint,
  WishlistItem,
  ScormPackage,
  ScormAttempt,
  H5PContent,
  H5PResult,
  XapiStatement,
  Survey,
  SurveyWithQuestions,
  Poll,
  PollResults,
  CourseFeedbackListResponse,
  CourseFeedbackEntry,
  SurveyResponse as SurveyResponseEntry,
  RealtimeTransportInfo,
  BulkJob,
  CreateBulkJobInput,
  Conversation,
  ChatMessage,
  CreateConversationInput,
  SendMessageInput,
  GlobalSearchResult,
  SearchAnalytics,
  SearchEntityType,
  UserLocalePreference,
  OrgLocalePreference,
  HelpCategory,
  HelpArticle,
  SupportTicket,
  TranscriptNote,
  NoteContext,
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
  PermissionRecord,
  ThreeDAssetRecord,
  ThreeDSceneRecord,
  ThreeDInteractionRecord,
  CodeExecutionRecord,
  CodeSubmissionRecord,
  CodeExecutionTestCaseRecord,
  CodeJudgeResult,
  CodeLanguage,
  CodeExecutionStatus,
  PluginListingRecord,
  PluginReviewRecord,
  PluginInstallationRecord,
  PluginPolicyRecord,
  PluginListingStatus,
  PluginReviewStatus,
  PopoutSessionResponse,
  PopoutValidationResponse,
  PluginPanelDefinition,
  PanelEntry,
  PanelPosition,
  PanelSize,
  UserPanelLayoutRecord,
} from "./lms-types";
import type { ListResponse } from "./api-client";

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: ApiClientError | Error | null;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
  refetch: () => Promise<void>;
  isLoading: boolean;
}

function useApiQuery<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setLoading(false);
    }
  }, deps);

  const refresh = useCallback(async () => {
    try {
      setData(await loader());
    } catch (caught) {
      console.error("Background refresh failed", caught);
    }
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    data,
    loading,
    error,
    reload,
    refresh,
    refetch: reload,
    isLoading: loading,
  };
}

export function useSession() {
  const [session, setLocalSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setLocalSession(getSession());
    const refresh = () => setLocalSession(getSession());
    window.addEventListener("lms-session-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("lms-session-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return session;
}

export function useRequireSession() {
  const session = useSession();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setChecked(true);
  }, []);

  useEffect(() => {
    if (!session?.accessToken || session.activeOrganization.permissionKeys) {
      return;
    }
    void api.hydrateSession().catch(() => undefined);
  }, [session?.accessToken, session?.activeOrganization.permissionKeys]);

  const unauthenticated = checked && !session;
  return { session, checked, unauthenticated };
}

export function useOrganizations() {
  return useApiQuery(() => api.organizations(), []);
}

export function useOrganizationMembers() {
  return useApiQuery<OrganizationMemberRecord[]>(
    () => api.organizationMembers(),
    [],
  );
}

export function useOrganizationRoles() {
  return useApiQuery<OrganizationRoleRecord[]>(
    () => api.organizationRoles(),
    [],
  );
}

export function useOrganizationPermissions() {
  return useApiQuery<PermissionRecord[]>(
    () => api.organizationPermissions(),
    [],
  );
}

export function useCreateOrganizationMember() {
  return useCallback(
    (input: {
      email: string;
      name?: string;
      password?: string;
      roleKeys?: string[];
    }) => api.createOrganizationMember(input),
    [],
  );
}

export function useInviteOrganizationMember() {
  return useCallback(
    (input: { email: string; roleKeys?: string[]; message?: string }) =>
      api.inviteOrganizationMember(input),
    [],
  );
}

export function useUpdateOrganizationMemberRoles() {
  return useCallback(
    (memberId: string, roleKeys: string[]) =>
      api.updateOrganizationMemberRoles(memberId, roleKeys),
    [],
  );
}

export function useUpdateOrganizationMemberStatus() {
  return useCallback(
    (memberId: string, status: OrganizationMemberRecord["status"]) =>
      api.updateOrganizationMemberStatus(memberId, status),
    [],
  );
}

export function useCreateOrganizationRole() {
  return useCallback(
    (input: {
      key: string;
      name: string;
      description?: string;
      permissionKeys?: string[];
    }) => api.createOrganizationRole(input),
    [],
  );
}

export function useUpdateOrganizationRole() {
  return useCallback(
    (
      roleId: string,
      input: {
        name?: string;
        description?: string;
        permissionKeys?: string[];
      },
    ) => api.updateOrganizationRole(roleId, input),
    [],
  );
}

export function useSwitchOrganization() {
  return useCallback(async (organizationId: string) => {
    const session = await api.switchOrganization(organizationId);
    setSession(session);
    window.location.href = "/";
  }, []);
}

export function useLogout() {
  return useCallback(async () => {
    await api.logout();
    window.location.href = "/login";
  }, []);
}

export function useCourses() {
  return useApiQuery(() => api.courses(), []);
}

export function useCourseDetail(slugOrId: string | null) {
  return useApiQuery<Course>(async () => {
    if (!slugOrId) throw new Error("Course id is required");
    return api.courseDetail(slugOrId);
  }, [slugOrId]);
}

export function useCourseCurriculum(courseId: string | null) {
  return useApiQuery<Course>(async () => {
    if (!courseId) throw new Error("Course id is required");
    return api.courseCurriculum(courseId);
  }, [courseId]);
}

export function useEnrollCourse() {
  return useCallback((courseId: string) => api.enrollCourse(courseId), []);
}

export function useMyEnrollments() {
  return useApiQuery<Enrollment[]>(() => api.myEnrollments(), []);
}

export function useLearningCourse(courseId: string | null) {
  return useApiQuery<LearningCourseResponse>(async () => {
    if (!courseId) throw new Error("Course id is required");
    return api.learningCourse(courseId);
  }, [courseId]);
}

export function useLesson(lessonId: string | null) {
  return useApiQuery<Lesson>(async () => {
    if (!lessonId) throw new Error("Lesson id is required");
    return api.lesson(lessonId);
  }, [lessonId]);
}

export function useActivityContent(activityId: string | null) {
  return useApiQuery<ActivityContentResponse>(async () => {
    if (!activityId) throw new Error("Activity id is required");
    return api.activityContent(activityId);
  }, [activityId]);
}

export function useStartActivity() {
  return useCallback((activityId: string) => api.startActivity(activityId), []);
}

export function useCompleteActivity() {
  return useCallback(
    (activityId: string) => api.completeActivity(activityId),
    [],
  );
}

export function useUpdateActivityProgress() {
  return useCallback(
    (
      activityId: string,
      progressPercent: number,
      metadata?: Record<string, unknown>,
    ) => api.updateActivityProgress(activityId, progressPercent, metadata),
    [],
  );
}

export function useUpdateVideoProgress() {
  return useCallback(
    (
      activityId: string,
      currentTimeSeconds: number,
      durationSeconds: number,
      watchedPercent?: number,
    ) =>
      api.updateVideoProgress(
        activityId,
        currentTimeSeconds,
        durationSeconds,
        watchedPercent,
      ),
    [],
  );
}

export function useWorkspacePreferences() {
  return useApiQuery<LearningWorkspacePreference>(
    () => api.workspacePreferences(),
    [],
  );
}

export function useUpdateWorkspacePreferences() {
  return useCallback(
    (input: Record<string, unknown>) => api.updateWorkspacePreferences(input),
    [],
  );
}

export function useLessonWorkspaceState(query: {
  courseId?: string | null;
  lessonId?: string | null;
  activityId?: string | null;
}) {
  return useApiQuery<LessonWorkspaceState>(
    async () => api.workspaceState(query),
    [query.courseId, query.lessonId, query.activityId],
  );
}

export function useUpdateLessonWorkspaceState() {
  return useCallback(
    (input: Record<string, unknown>) => api.updateWorkspaceState(input),
    [],
  );
}

export function useLearnerNotes(query: {
  courseId?: string | null;
  lessonId?: string | null;
  activityId?: string | null;
}) {
  return useApiQuery<LearnerNote[]>(
    async () => api.learnerNotes(query),
    [query.courseId, query.lessonId, query.activityId],
  );
}

export function useCreateLearnerNote() {
  return useCallback(
    (input: Record<string, unknown>) => api.createLearnerNote(input),
    [],
  );
}

export function useUpdateLearnerNote() {
  return useCallback(
    (noteId: string, input: Record<string, unknown>) =>
      api.updateLearnerNote(noteId, input),
    [],
  );
}

export function useDeleteLearnerNote() {
  return useCallback((noteId: string) => api.deleteLearnerNote(noteId), []);
}

export function useLearnerBookmarks(query: {
  courseId?: string | null;
  lessonId?: string | null;
  activityId?: string | null;
}) {
  return useApiQuery<LearnerBookmark[]>(
    async () => api.learnerBookmarks(query),
    [query.courseId, query.lessonId, query.activityId],
  );
}

export function useCreateLearnerBookmark() {
  return useCallback(
    (input: Record<string, unknown>) => api.createLearnerBookmark(input),
    [],
  );
}

export function useUpdateLearnerBookmark() {
  return useCallback(
    (bookmarkId: string, input: Record<string, unknown>) =>
      api.updateLearnerBookmark(bookmarkId, input),
    [],
  );
}

export function useDeleteLearnerBookmark() {
  return useCallback(
    (bookmarkId: string) => api.deleteLearnerBookmark(bookmarkId),
    [],
  );
}

export function useTranscript(
  activityId: string | null,
  language?: string | null,
) {
  return useApiQuery<TranscriptSegment[]>(async () => {
    if (!activityId) throw new Error("Activity id is required");
    return api.transcript(activityId, { language });
  }, [activityId, language]);
}

export function useCaptionTracks(activityId: string | null) {
  return useApiQuery<VideoCaptionTrack[]>(async () => {
    if (!activityId) throw new Error("Activity id is required");
    return api.captionTracks(activityId);
  }, [activityId]);
}

export function useWorkspaceContext(activityId: string | null) {
  return useApiQuery<WorkspaceContext>(async () => {
    if (!activityId) throw new Error("Activity id is required");
    return api.workspaceContext(activityId);
  }, [activityId]);
}

export function useInstructorCourses() {
  return useApiQuery<Course[]>(() => api.instructorCourses(), []);
}

export function useInstructorCourse(courseId: string | null) {
  return useApiQuery<Course>(async () => {
    if (!courseId) throw new Error("Course id is required");
    return api.instructorCourse(courseId);
  }, [courseId]);
}

export function useInstructorCaptionTracks(activityId: string | null) {
  return useApiQuery<VideoCaptionTrack[]>(async () => {
    if (!activityId) throw new Error("Activity id is required");
    return api.instructorCaptionTracks(activityId);
  }, [activityId]);
}

export function useCreateInstructorCaptionTrack() {
  return useCallback(
    (activityId: string, input: Record<string, unknown>) =>
      api.createInstructorCaptionTrack(activityId, input),
    [],
  );
}

export function useUpdateInstructorCaptionTrack() {
  return useCallback(
    (trackId: string, input: Record<string, unknown>) =>
      api.updateInstructorCaptionTrack(trackId, input),
    [],
  );
}

export function useDeleteInstructorCaptionTrack() {
  return useCallback(
    (trackId: string) => api.deleteInstructorCaptionTrack(trackId),
    [],
  );
}

export function useInstructorAiGeneratedItems(activityId: string | null) {
  return useApiQuery<AiGeneratedItem[]>(async () => {
    if (!activityId) throw new Error("Activity id is required");
    return api.instructorAiGeneratedItems(activityId);
  }, [activityId]);
}

export function useGenerateInstructorVideoSummary() {
  return useCallback(
    (activityId: string, input: Record<string, unknown>) =>
      api.generateInstructorVideoSummary(activityId, input),
    [],
  );
}

export function useGenerateInstructorVideoQuiz() {
  return useCallback(
    (activityId: string, input: Record<string, unknown>) =>
      api.generateInstructorVideoQuiz(activityId, input),
    [],
  );
}

export function useListInstructorAiItems(query: Record<string, string | undefined> = {}) {
  return useApiQuery<AiGeneratedItem[]>(
    () => api.listInstructorAiItems(query),
    [JSON.stringify(query)],
  );
}

export function useApproveAiItem() {
  return useCallback((itemId: string) => api.approveInstructorAiItem(itemId), []);
}

export function useRejectAiItem() {
  return useCallback((itemId: string, reason?: string) =>
    api.rejectInstructorAiItem(itemId, reason), []);
}

export function usePublishAiItem() {
  return useCallback((itemId: string) => api.publishInstructorAiItem(itemId), []);
}

export function useUpdateAiItem() {
  return useCallback((itemId: string, input: Record<string, unknown>) =>
    api.updateInstructorAiItem(itemId, input), []);
}

export function useActivityFlashcards(activityId: string | null) {
  return useApiQuery<unknown[]>(async () => {
    if (!activityId) throw new Error("Activity id is required");
    return api.activityFlashcards(activityId);
  }, [activityId]);
}

export function useInstructorAiIndexCourse() {
  return useCallback((courseId: string) => api.instructorAiIndexCourse(courseId), []);
}

export function useInstructorAiIndexStatus(courseId: string | null) {
  return useApiQuery<{
    status: string;
    documentCount: number;
    chunkCount: number;
    needsReindex: boolean;
  }>(async () => {
    if (!courseId) throw new Error("Course id is required");
    return api.instructorAiIndexStatus(courseId);
  }, [courseId]);
}

// Phase 17 caption cue editor hooks
export function useListCaptionCues(trackId: string | null) {
  return useApiQuery<unknown[]>(async () => {
    if (!trackId) throw new Error("Track id is required");
    return api.listInstructorCaptionCues(trackId);
  }, [trackId]);
}

export function useCreateCaptionCue() {
  return useCallback(
    (trackId: string, input: { startSeconds: number; endSeconds: number; text: string }) =>
      api.createInstructorCaptionCue(trackId, input),
    [],
  );
}

export function useUpdateCaptionCue() {
  return useCallback(
    (trackId: string, cueIndex: number, input: { startSeconds?: number; endSeconds?: number; text?: string }) =>
      api.updateInstructorCaptionCue(trackId, cueIndex, input),
    [],
  );
}

export function useDeleteCaptionCue() {
  return useCallback((trackId: string, cueIndex: number) =>
    api.deleteInstructorCaptionCue(trackId, cueIndex), []);
}

export function useReorderCaptionCues() {
  return useCallback((trackId: string, orderedIndices: number[]) =>
    api.reorderInstructorCaptionCues(trackId, orderedIndices), []);
}

// Phase 18: Advanced assignment hooks
export function useAssignmentGroups(assignmentId: string | null) {
  return useApiQuery(async () => {
    if (!assignmentId) throw new Error("Assignment id is required");
    return api.listAssignmentGroups(assignmentId);
  }, [assignmentId]);
}

export function useCreateAssignmentGroup() {
  return useCallback(
    (assignmentId: string, input: { name: string; maxMembers?: number; memberIds?: string[] }) =>
      api.createAssignmentGroup(assignmentId, input),
    [],
  );
}

export function useUpdateAssignmentGroup() {
  return useCallback(
    (
      assignmentId: string,
      groupId: string,
      input: { name?: string; maxMembers?: number; status?: "ACTIVE" | "ARCHIVED" },
    ) => api.updateAssignmentGroup(assignmentId, groupId, input),
    [],
  );
}

export function useDeleteAssignmentGroup() {
  return useCallback((assignmentId: string, groupId: string) =>
    api.deleteAssignmentGroup(assignmentId, groupId), []);
}

export function useAddAssignmentGroupMember() {
  return useCallback(
    (assignmentId: string, groupId: string, userId: string, role: "member" | "leader" = "member") =>
      api.addAssignmentGroupMember(assignmentId, groupId, userId, role),
    [],
  );
}

export function useRemoveAssignmentGroupMember() {
  return useCallback((assignmentId: string, groupId: string, userId: string) =>
    api.removeAssignmentGroupMember(assignmentId, groupId, userId), []);
}

export function useUpdateAssignmentCollaboration() {
  return useCallback(
    (
      assignmentId: string,
      input: {
        collaborationMode?: "INDIVIDUAL" | "GROUP";
        groupMinMembers?: number;
        groupMaxMembers?: number;
        maxResubmissions?: number;
      },
    ) => api.updateAssignmentCollaboration(assignmentId, input),
    [],
  );
}

export function usePeerReviewConfig(assignmentId: string | null) {
  return useApiQuery(async () => {
    if (!assignmentId) throw new Error("Assignment id is required");
    return api.getPeerReviewConfig(assignmentId);
  }, [assignmentId]);
}

export function useUpsertPeerReviewConfig() {
  return useCallback(
    (
      assignmentId: string,
      input: Record<string, unknown>,
      method: "POST" | "PATCH" = "POST",
    ) => api.upsertPeerReviewConfig(assignmentId, input, method),
    [],
  );
}

export function useGeneratePeerReviewMatches() {
  return useCallback((assignmentId: string) =>
    api.generatePeerReviewMatches(assignmentId), []);
}

export function usePeerReviewMatches(assignmentId: string | null) {
  return useApiQuery(async () => {
    if (!assignmentId) throw new Error("Assignment id is required");
    return api.listPeerReviewMatches(assignmentId);
  }, [assignmentId]);
}

export function useSubmissionAnnotations(submissionId: string | null) {
  return useApiQuery(async () => {
    if (!submissionId) throw new Error("Submission id is required");
    return api.listSubmissionAnnotations(submissionId);
  }, [submissionId]);
}

export function useLearnerSubmissionAnnotations(submissionId: string | null) {
  return useApiQuery(async () => {
    if (!submissionId) throw new Error("Submission id is required");
    return api.listLearnerSubmissionAnnotations(submissionId);
  }, [submissionId]);
}

export function useCreateSubmissionAnnotation() {
  return useCallback(
    (
      submissionId: string,
      input: { startOffset: number; endOffset: number; selectedText: string; comment: string },
    ) => api.createSubmissionAnnotation(submissionId, input),
    [],
  );
}

export function useUpdateSubmissionAnnotation() {
  return useCallback(
    (submissionId: string, annotationId: string, input: { comment?: string; resolved?: boolean }) =>
      api.updateSubmissionAnnotation(submissionId, annotationId, input),
    [],
  );
}

export function useDeleteSubmissionAnnotation() {
  return useCallback((submissionId: string, annotationId: string) =>
    api.deleteSubmissionAnnotation(submissionId, annotationId), []);
}

export function usePlagiarismChecks(submissionId: string | null) {
  return useApiQuery(async () => {
    if (!submissionId) throw new Error("Submission id is required");
    return api.listPlagiarismChecks(submissionId);
  }, [submissionId]);
}

export function useRunPlagiarismCheck() {
  return useCallback((submissionId: string, input: { provider?: string } = {}) =>
    api.runPlagiarismCheck(submissionId, input), []);
}

export function useCourseShowcases(courseId: string | null) {
  return useApiQuery(async () => {
    if (!courseId) throw new Error("Course id is required");
    return api.listCourseShowcases(courseId);
  }, [courseId]);
}

export function useCreateCourseShowcase() {
  return useCallback(
    (
      courseId: string,
      input: {
        submissionId: string;
        title: string;
        summary?: string;
        thumbnailUrl?: string;
        externalUrl?: string;
        publish?: boolean;
      },
    ) => api.createCourseShowcase(courseId, input),
    [],
  );
}

export function useUpdateCourseShowcase() {
  return useCallback((showcaseId: string, input: Record<string, unknown>) =>
    api.updateCourseShowcase(showcaseId, input), []);
}

export function useDeleteCourseShowcase() {
  return useCallback((showcaseId: string) =>
    api.deleteCourseShowcase(showcaseId), []);
}

// Learner hooks
export function useMyPortfolio() {
  return useApiQuery(() => api.getMyPortfolio(), []);
}

export function useUpdateMyPortfolio() {
  return useCallback(
    (input: { title?: string; description?: string; isPublic?: boolean }) =>
      api.updateMyPortfolio(input),
    [],
  );
}

export function useAddPortfolioEntry() {
  return useCallback(
    (input: {
      title: string;
      description?: string;
      submissionId?: string;
      showcaseId?: string;
      orderIndex?: number;
    }) => api.addPortfolioEntry(input),
    [],
  );
}

export function useUpdatePortfolioEntry() {
  return useCallback(
    (entryId: string, input: { title?: string; description?: string; orderIndex?: number }) =>
      api.updatePortfolioEntry(entryId, input),
    [],
  );
}

export function useRemovePortfolioEntry() {
  return useCallback((entryId: string) => api.removePortfolioEntry(entryId), []);
}

export function useLearnerPeerReviews() {
  return useApiQuery(() => api.listLearnerPeerReviews(), []);
}

export function useSubmitLearnerPeerReview() {
  return useCallback(
    (
      matchId: string,
      input: { overallScore?: number; feedback?: string; rubricScores?: { criterionId: string; levelId?: string; points: number; feedback?: string }[] },
    ) => api.submitLearnerPeerReview(matchId, input),
    [],
  );
}

export function usePublicPortfolio(shareToken: string | null) {
  return useApiQuery(async () => {
    if (!shareToken) throw new Error("Share token is required");
    return api.getPublicPortfolio(shareToken);
  }, [shareToken]);
}

export function useFiles() {
  return useApiQuery<{ data: FileAsset[]; meta?: Record<string, unknown> }>(
    () => api.files(),
    [],
  );
}

export function useUploadFile() {
  return useCallback((formData: FormData) => api.uploadFile(formData), []);
}

export function useSignedFileUrl() {
  return useCallback((fileId: string) => api.signedFileUrl(fileId), []);
}

export function useContentLibrary() {
  return useApiQuery<ContentLibraryItem[]>(() => api.contentLibrary(), []);
}

export function usePluginActivityTypes() {
  return useApiQuery<{
    organizationId: string;
    activityTypes: PluginActivityType[];
  }>(() => api.pluginActivityTypes(), []);
}

export function useAdminPlugins() {
  return useApiQuery<Plugin[]>(() => api.adminPlugins(), []);
}

export function useAdminPlugin(pluginKey: string | null) {
  return useApiQuery<Plugin>(async () => {
    if (!pluginKey) throw new Error("Plugin key is required");
    return api.adminPlugin(pluginKey);
  }, [pluginKey]);
}

export function usePluginLogs(pluginKey: string | null) {
  return useApiQuery<PluginExecutionLog[]>(async () => {
    if (!pluginKey) throw new Error("Plugin key is required");
    return api.pluginLogs(pluginKey);
  }, [pluginKey]);
}

export function useQuestionBanks() {
  return useApiQuery<QuestionBank[]>(() => api.questionBanks(), []);
}

export function useCreateQuestionBank() {
  return useCallback(
    (input: Record<string, unknown>) => api.createQuestionBank(input),
    [],
  );
}

export function useQuestions(bankId?: string | null) {
  return useApiQuery<Question[]>(() => api.questions(bankId), [bankId]);
}

export function useCreateQuestion() {
  return useCallback(
    (input: Record<string, unknown>) => api.createQuestion(input),
    [],
  );
}

export function useInstructorQuizzes() {
  return useApiQuery<Quiz[]>(() => api.instructorQuizzes(), []);
}

export function useInstructorQuiz(quizId: string | null) {
  return useApiQuery<Quiz>(async () => {
    if (!quizId) throw new Error("Quiz id is required");
    return api.instructorQuiz(quizId);
  }, [quizId]);
}

export function useLearnerQuiz(activityId: string | null) {
  return useApiQuery<LearnerQuizResponse>(async () => {
    if (!activityId) throw new Error("Activity id is required");
    return api.learnerQuiz(activityId);
  }, [activityId]);
}

export function useMyQuizAttempts() {
  return useApiQuery<QuizAttempt[]>(() => api.myQuizAttempts(), []);
}

export function useQuizAttempts(quizId: string | null) {
  return useApiQuery<QuizAttempt[]>(async () => {
    if (!quizId) throw new Error("Quiz id is required");
    return api.quizAttempts(quizId);
  }, [quizId]);
}

export function useUpdateActivityContent() {
  return useCallback(
    (activityId: string, input: Record<string, unknown>) =>
      api.updateActivityContent(activityId, input),
    [],
  );
}

export function useAttachFileToActivity() {
  return useCallback(
    (activityId: string, fileId: string) =>
      api.attachFileToActivity(activityId, fileId),
    [],
  );
}

export function useAttachLibraryItemToActivity() {
  return useCallback(
    (activityId: string, libraryItemId: string) =>
      api.attachLibraryItemToActivity(activityId, libraryItemId),
    [],
  );
}

export function useAuthActions() {
  return useMemo(
    () => ({
      clearSession,
    }),
    [],
  );
}

export function useAiStatus() {
  return useApiQuery<AiStatus>(() => api.aiStatus(), []);
}

export function useAskAiTutor() {
  return useCallback(
    (input: {
      courseId: string;
      lessonId: string;
      activityId: string;
      question: string;
      conversationId?: string;
    }): Promise<AiTutorResponse> => api.askAiTutor(input),
    [],
  );
}

export function useAssignments(courseId: string | null) {
  return useApiQuery<Assignment[]>(async () => {
    if (!courseId) throw new Error("Course id is required");
    return api.assignments(courseId);
  }, [courseId]);
}

export function useAssignment(assignmentId: string | null) {
  return useApiQuery<Assignment>(async () => {
    if (!assignmentId) throw new Error("Assignment id is required");
    return api.assignment(assignmentId);
  }, [assignmentId]);
}

export function useCreateAssignment() {
  return useCallback(
    (courseId: string, input: Record<string, unknown>) =>
      api.createAssignment(courseId, input),
    [],
  );
}

export function useUpdateAssignment() {
  return useCallback(
    (assignmentId: string, input: Record<string, unknown>) =>
      api.updateAssignment(assignmentId, input),
    [],
  );
}

export function usePublishAssignment() {
  return useCallback(
    (assignmentId: string) => api.publishAssignment(assignmentId),
    [],
  );
}

export function useLearnerAssignment(assignmentId: string | null) {
  return useApiQuery<LearnerAssignmentResponse>(async () => {
    if (!assignmentId) throw new Error("Assignment id is required");
    return api.learnerAssignment(assignmentId);
  }, [assignmentId]);
}

export function useCreateSubmission() {
  return useCallback(
    (assignmentId: string, input: Record<string, unknown>) =>
      api.createSubmission(assignmentId, input),
    [],
  );
}

export function useUpdateSubmission() {
  return useCallback(
    (submissionId: string, input: Record<string, unknown>) =>
      api.updateSubmission(submissionId, input),
    [],
  );
}

export function useSubmitSubmission() {
  return useCallback(
    (submissionId: string) => api.submitSubmission(submissionId),
    [],
  );
}

export function useInstructorSubmission(submissionId: string | null) {
  return useApiQuery<AssignmentSubmission>(async () => {
    if (!submissionId) throw new Error("Submission id is required");
    return api.submission(submissionId);
  }, [submissionId]);
}

export function useSubmissionResult(submissionId: string | null) {
  return useApiQuery<AssignmentSubmission>(async () => {
    if (!submissionId) throw new Error("Submission id is required");
    return api.submissionResult(submissionId);
  }, [submissionId]);
}

export function useAssignmentSubmissions(assignmentId: string | null) {
  return useApiQuery<AssignmentSubmission[]>(async () => {
    if (!assignmentId) throw new Error("Assignment id is required");
    return api.assignmentSubmissions(assignmentId);
  }, [assignmentId]);
}

export function useGradeSubmission() {
  return useCallback(
    (submissionId: string, input: Record<string, unknown>) =>
      api.gradeSubmission(submissionId, input),
    [],
  );
}

export function useRubrics() {
  return useApiQuery<Rubric[]>(() => api.rubrics(), []);
}

export function useRubric(rubricId: string | null) {
  return useApiQuery<Rubric>(async () => {
    if (!rubricId) throw new Error("Rubric id is required");
    return api.rubric(rubricId);
  }, [rubricId]);
}

export function useCreateRubric() {
  return useCallback(
    (input: Record<string, unknown>) => api.createRubric(input),
    [],
  );
}

export function useUpdateRubric() {
  return useCallback(
    (rubricId: string, input: Record<string, unknown>) =>
      api.updateRubric(rubricId, input),
    [],
  );
}

export function useCertificates() {
  return useApiQuery<Certificate[]>(() => api.certificates(), []);
}

export function useCertificate(certificateId: string | null) {
  return useApiQuery<Certificate>(async () => {
    if (!certificateId) throw new Error("Certificate id is required");
    return api.certificate(certificateId);
  }, [certificateId]);
}

export function useVerifyCertificate(verificationCode: string | null) {
  return useApiQuery<CertificateVerification>(async () => {
    if (!verificationCode) throw new Error("Verification code is required");
    return api.verifyCertificate(verificationCode);
  }, [verificationCode]);
}

export function useCertificateTemplates() {
  return useApiQuery<CertificateTemplate[]>(
    () => api.certificateTemplates(),
    [],
  );
}

export function useCreateCertificateTemplate() {
  return useCallback(
    (input: Record<string, unknown>) => api.createCertificateTemplate(input),
    [],
  );
}

export function useUpdateCertificateTemplate() {
  return useCallback(
    (templateId: string, input: Record<string, unknown>) =>
      api.updateCertificateTemplate(templateId, input),
    [],
  );
}

export function useCourseCertificates(courseId: string | null) {
  return useApiQuery<Certificate[]>(async () => {
    if (!courseId) throw new Error("Course id is required");
    return api.courseCertificates(courseId);
  }, [courseId]);
}

export function useLearningGoals() {
  return useApiQuery<LearningGoal[]>(() => api.learningGoals(), []);
}

export function useCreateLearningGoal() {
  return useCallback(
    (input: Record<string, unknown>) => api.createLearningGoal(input),
    [],
  );
}

export function useUpdateLearningGoal() {
  return useCallback(
    (goalId: string, input: Record<string, unknown>) =>
      api.updateLearningGoal(goalId, input),
    [],
  );
}

// ── Analytics hooks ──────────────────────────────────

export function useLearnerDashboard() {
  return useApiQuery<LearnerDashboard>(async () => {
    return api.learnerDashboard();
  }, []);
}

export function useLearnerCourseProgress(courseId: string | null) {
  return useApiQuery<LearnerCourseProgress>(async () => {
    if (!courseId) throw new Error("Course id is required");
    return api.learnerCourseProgress(courseId);
  }, [courseId]);
}

export function useLearnerGrades(courseId?: string) {
  return useApiQuery<LearnerGrades>(async () => {
    return api.learnerGrades(courseId);
  }, [courseId]);
}

export function useLearnerStreak() {
  return useApiQuery<LearnerStreak>(async () => {
    return api.learnerStreak();
  }, []);
}

export function useStartStudySession() {
  return useCallback((input: { courseId?: string; goalId?: string; targetSeconds?: number }) =>
    api.startStudySession(input), []);
}

export function useListStudySessions(params?: { status?: string; from?: string; to?: string; limit?: number }) {
  return useApiQuery<StudySession[]>(async () => api.listStudySessions(params), [JSON.stringify(params)]);
}

export function useGetStudySession(id: string | null) {
  return useApiQuery<StudySession>(async () => {
    if (!id) throw new Error("Session id required");
    return api.getStudySession(id);
  }, [id]);
}

export function useUpdateStudySession() {
  return useCallback((id: string, input: { status?: string; elapsedSeconds?: number }) =>
    api.updateStudySession(id, input), []);
}

export function useCancelStudySession() {
  return useCallback((id: string) => api.cancelStudySession(id), []);
}

export function useInstructorDashboard() {
  return useApiQuery<InstructorDashboard>(async () => {
    return api.instructorDashboard();
  }, []);
}

export function useAdminOverview() {
  return useApiQuery<AdminOverview>(async () => {
    return api.adminOverview();
  }, []);
}

export function useAdminCourseMetrics(query?: Record<string, string>) {
  return useApiQuery(async () => {
    const result = await api.adminCourseMetrics(query);
    return result;
  }, [JSON.stringify(query)]);
}

export function useAdminTrends(query?: Record<string, string>) {
  return useApiQuery<DailyTrend[]>(async () => {
    return api.adminTrends(query);
  }, [JSON.stringify(query)]);
}

export function useAuditLogs(query?: Record<string, string>) {
  return useApiQuery<ListResponse<AuditLogEntry>>(async () => {
    return api.auditLogs(query);
  }, [JSON.stringify(query)]);
}

export function useInstructorCourseRoster(courseId: string | null, query?: Record<string, string>) {
  return useApiQuery(async () => {
    if (!courseId) throw new Error("Course id is required");
    const result = await api.instructorCourseRoster(courseId, query);
    return result;
  }, [courseId, JSON.stringify(query)]);
}

export function useInstructorCourseGradebook(courseId: string | null) {
  return useApiQuery(async () => {
    if (!courseId) throw new Error("Course id is required");
    const data = await api.instructorCourseGradebook(courseId);
    return { data, meta: {} };
  }, [courseId]);
}

export function useReviewLateSubmission() {
  return useCallback((submissionId: string, input: Record<string, unknown>) => api.reviewLateSubmission(submissionId, input), []);
}

export function useInstructorCourseEngagement(courseId: string | null, query?: Record<string, string>) {
  return useApiQuery(async () => {
    if (!courseId) throw new Error("Course id is required");
    return api.instructorCourseEngagement(courseId, query);
  }, [courseId, JSON.stringify(query)]);
}

// ── Phase 11 — Learning Path & Gamification hooks ──

export function useLearningPaths(query?: Record<string, string>) {
  return useApiQuery<ListResponse<LearningPath>>(async () => {
    return api.learningPaths(query);
  }, [JSON.stringify(query)]);
}

export function useLearningPath(idOrSlug: string | null) {
  return useApiQuery<LearningPath>(async () => {
    if (!idOrSlug) throw new Error("Learning path identifier is required");
    return api.learningPath(idOrSlug);
  }, [idOrSlug]);
}

export function useMyLearningPathEnrollments() {
  return useApiQuery<LearningPathEnrollment[]>(async () => {
    return api.myLearningPathEnrollments();
  }, []);
}

export function useCreateLearningPath() {
  return useCallback(
    (input: Record<string, unknown>) => api.createLearningPath(input),
    [],
  );
}

export function useUpdateLearningPath() {
  return useCallback(
    (id: string, input: Record<string, unknown>) =>
      api.updateLearningPath(id, input),
    [],
  );
}

export function useDeleteLearningPath() {
  return useCallback((id: string) => api.deleteLearningPath(id), []);
}

export function useAddCourseToPath() {
  return useCallback(
    (id: string, input: Record<string, unknown>) =>
      api.addCourseToPath(id, input),
    [],
  );
}

export function useRemoveCourseFromPath() {
  return useCallback(
    (id: string, courseId: string) => api.removeCourseFromPath(id, courseId),
    [],
  );
}

export function useSkills(category?: string) {
  return useApiQuery<Skill[]>(async () => {
    return api.skills(category);
  }, [category]);
}

export function useMySkills() {
  return useApiQuery<UserSkill[]>(async () => {
    return api.mySkills();
  }, []);
}

export function useMyXpHistory(query?: Record<string, string>) {
  return useApiQuery(async () => {
    const result = await api.myXpHistory(query);
    return result;
  }, [JSON.stringify(query)]);
}

export function useLeaderboard(query?: Record<string, string>) {
  return useApiQuery<LeaderboardEntry[]>(async () => {
    return api.leaderboard(query);
  }, [JSON.stringify(query)]);
}

export function useAchievements() {
  return useApiQuery<Achievement[]>(async () => {
    return api.achievements();
  }, []);
}

export function useMyAchievements() {
  return useApiQuery<UserAchievement[]>(async () => {
    return api.myAchievements();
  }, []);
}

// ── Phase 12 — Marketplace hooks ────────────────────

export function useMyOrders(query?: Record<string, string>) {
  return useApiQuery(async () => {
    const result = await api.myOrders(query);
    return result;
  }, [JSON.stringify(query)]);
}

export function useOrder(id: string | null) {
  return useApiQuery<Order>(async () => {
    if (!id) throw new Error("Order id is required");
    return api.getOrder(id);
  }, [id]);
}

export function useCoupons() {
  return useApiQuery<Coupon[]>(async () => {
    return api.coupons();
  }, []);
}

export function useSubscriptionPlans() {
  return useApiQuery<SubscriptionPlan[]>(async () => {
    return api.subscriptionPlans();
  }, []);
}

export function useMySubscriptions() {
  return useApiQuery<UserSubscription[]>(async () => {
    return api.mySubscriptions();
  }, []);
}

export function useAdminOrders(query?: Record<string, string>) {
  return useApiQuery(async () => {
    const result = await api.adminOrders(query);
    return result;
  }, [JSON.stringify(query)]);
}

export function useAdminPayments(query?: Record<string, string>) {
  return useApiQuery(async () => {
    const result = await api.adminPayments(query);
    return result;
  }, [JSON.stringify(query)]);
}

// ── Phase 13 — Enterprise hooks ─────────────────────

export function useBranding() {
  return useApiQuery<Branding>(async () => {
    return api.getBranding();
  }, []);
}

export function useSsoProviders() {
  return useApiQuery<SsoProvider[]>(async () => {
    return api.ssoProviders();
  }, []);
}

export function useLoginPolicy() {
  return useApiQuery<LoginPolicy>(async () => {
    return api.getLoginPolicy();
  }, []);
}

export function useDomains() {
  return useApiQuery<OrgDomain[]>(async () => {
    return api.domains();
  }, []);
}

export function useApiKeys() {
  return useApiQuery<ApiKey[]>(async () => {
    return api.apiKeys();
  }, []);
}

export function useWebhooks() {
  return useApiQuery<WebhookEndpoint[]>(async () => {
    return api.webhooks();
  }, []);
}

export function useWebhookDeliveries(endpointId: string | null, query?: Record<string, string>) {
  return useApiQuery(async () => {
    if (!endpointId) throw new Error("Endpoint id is required");
    const result = await api.webhookDeliveries(endpointId, query);
    return result;
  }, [endpointId, JSON.stringify(query)]);
}

// ── Phase 15 — Reviews, Wishlist, Favorites hooks ──

export function useCourseReviews(courseId: string | null, query?: Record<string, string>) {
  return useApiQuery(async () => {
    if (!courseId) throw new Error("Course id is required");
    const result = await api.courseReviews(courseId, query);
    return result;
  }, [courseId, JSON.stringify(query)]);
}

export function useWishlist() {
  return useApiQuery<WishlistItem[]>(async () => {
    return api.wishlist();
  }, []);
}

export function useFavoriteInstructors() {
  return useApiQuery<FavoriteInstructor[]>(async () => {
    return api.favoriteInstructors();
  }, []);
}

export function useRecentlyViewed() {
  return useApiQuery<RecentlyViewedCourse[]>(async () => {
    return api.recentlyViewed();
  }, []);
}

export function useAdminReviews(query?: Record<string, string>) {
  return useApiQuery(async () => {
    const result = await api.adminReviews(query);
    return result;
  }, [JSON.stringify(query)]);
}

export function useExportNotes() {
  return useApiQuery<NotesExport>(async () => {
    return api.exportNotes();
  }, []);
}

// ── Phase 16: Experiences ──
export function useScormPackages(courseId?: string) {
  return useApiQuery<ScormPackage[]>(() => api.listScormPackages(courseId), [courseId]);
}
export function useScormPackage(id: string | null) {
  return useApiQuery<ScormPackage | null>(async () => {
    if (!id) return null;
    return api.getScormPackage(id);
  }, [id]);
}
export function useStartScormAttempt() {
  return useCallback(
    (packageId: string, input: Record<string, unknown> = {}) =>
      api.startScormAttempt(packageId, input),
    [],
  );
}
export function useCommitScormAttempt() {
  return useCallback(
    (packageId: string, attemptId: string, input: Record<string, unknown>) =>
      api.commitScormAttempt(packageId, attemptId, input),
    [],
  );
}

export function useH5PContent(courseId?: string) {
  return useApiQuery<H5PContent[]>(() => api.listH5PContent(courseId), [courseId]);
}
export function useSubmitH5PResult() {
  return useCallback(
    (contentId: string, input: Record<string, unknown>) =>
      api.submitH5PResult(contentId, input),
    [],
  );
}

export function useXapiStatements(limit = 50) {
  return useApiQuery<XapiStatement[]>(() => api.listXapiStatements(limit), [limit]);
}
export function usePostXapiStatements() {
  return useCallback(
    (statements: Array<Record<string, unknown>>) => api.postXapiStatements(statements),
    [],
  );
}

export function useSurveys(query?: Record<string, string>) {
  return useApiQuery<Survey[]>(() => api.listSurveys(query), [JSON.stringify(query)]);
}
export function useSurvey(id: string | null) {
  return useApiQuery<SurveyWithQuestions | null>(async () => {
    if (!id) return null;
    return api.getSurvey(id);
  }, [id]);
}
export function useCreateSurvey() {
  return useCallback((input: Record<string, unknown>) => api.createSurvey(input), []);
}
export function useUpdateSurvey() {
  return useCallback((id: string, input: Record<string, unknown>) => api.updateSurvey(id, input), []);
}
export function useDeleteSurvey() {
  return useCallback((id: string) => api.deleteSurvey(id), []);
}
export function useAddSurveyQuestion() {
  return useCallback(
    (surveyId: string, input: Record<string, unknown>) => api.addSurveyQuestion(surveyId, input),
    [],
  );
}
export function useRemoveSurveyQuestion() {
  return useCallback(
    (surveyId: string, questionId: string) => api.removeSurveyQuestion(surveyId, questionId),
    [],
  );
}
export function useSubmitSurveyResponse() {
  return useCallback(
    (surveyId: string, input: Record<string, unknown>) => api.submitSurveyResponse(surveyId, input),
    [],
  );
}
export function useSurveyResponses(surveyId: string | null) {
  return useApiQuery<SurveyResponseEntry[]>(async () => {
    if (!surveyId) return [];
    return api.listSurveyResponses(surveyId);
  }, [surveyId]);
}

export function usePolls(query?: Record<string, string>) {
  return useApiQuery<Poll[]>(() => api.listPolls(query), [JSON.stringify(query)]);
}
export function useCreatePoll() {
  return useCallback((input: Record<string, unknown>) => api.createPoll(input), []);
}
export function useUpdatePoll() {
  return useCallback((id: string, input: Record<string, unknown>) => api.updatePoll(id, input), []);
}
export function useDeletePoll() {
  return useCallback((id: string) => api.deletePoll(id), []);
}
export function useVotePoll() {
  return useCallback((id: string, selected: string[]) => api.votePoll(id, selected), []);
}
export function usePollResults(id: string | null) {
  return useApiQuery<PollResults | null>(async () => {
    if (!id) return null;
    return api.pollResults(id);
  }, [id]);
}

export function useSubmitCourseFeedback() {
  return useCallback(
    (input: { courseId: string; rating: number; comment?: string }) =>
      api.submitCourseFeedback(input),
    [],
  );
}
export function useCourseFeedback(courseId: string | null) {
  return useApiQuery<CourseFeedbackListResponse | null>(async () => {
    if (!courseId) return null;
    return api.listCourseFeedback(courseId);
  }, [courseId]);
}

// ── Phase 24: Realtime Gateway hooks ────────────────

export function useRealtimeTransports() {
  return useApiQuery<RealtimeTransportInfo>(async () => {
    const res = await api.realtimeTransports();
    return res.data;
  }, []);
}

export function useBulkJobs(query?: { type?: string; status?: string }) {
  return useApiQuery<BulkJob[]>(async () => {
    const res = await api.listBulkJobs(query);
    return res.data;
  }, [JSON.stringify(query)]);
}

export function useBulkJob(id: string | null) {
  return useApiQuery<BulkJob | null>(async () => {
    if (!id) return null;
    const res = await api.getBulkJob(id);
    return res.data;
  }, [id]);
}

export function useCreateBulkJob() {
  return useCallback((input: CreateBulkJobInput) => api.createBulkJob(input), []);
}

export function useCancelBulkJob() {
  return useCallback((id: string, reason: string) => api.cancelBulkJob(id, reason), []);
}

export function useResumeBulkJob() {
  return useCallback((id: string) => api.resumeBulkJob(id), []);
}

// ── Phase 27: Direct Messaging hooks ────────────────

export function useConversations() {
  return useApiQuery<Conversation[]>(async () => {
    const res = await api.listConversations();
    return res.data;
  }, []);
}

export function useConversation(id: string | null) {
  return useApiQuery<Conversation | null>(async () => {
    if (!id) return null;
    const res = await api.getConversation(id);
    return res.data;
  }, [id]);
}

export function useMessages(conversationId: string | null, params?: { cursor?: string; limit?: number }) {
  return useApiQuery<{
    data: ChatMessage[];
    meta?: { limit: number; nextCursor: string | null; hasMore: boolean };
  } | null>(async () => {
    if (!conversationId) return null;
    return api.listMessages(conversationId, params);
  }, [conversationId, JSON.stringify(params)]);
}

export function useCreateConversation() {
  return useCallback((input: CreateConversationInput) => api.createConversation(input), []);
}

export function useAddConversationMembers() {
  return useCallback((id: string, userIds: string[]) => api.addConversationMembers(id, userIds), []);
}

export function useSendMessage() {
  return useCallback((conversationId: string, input: SendMessageInput) =>
    api.sendMessage(conversationId, input), []);
}

export function useEditMessage() {
  return useCallback((messageId: string, content: string) =>
    api.editMessage(messageId, content), []);
}

export function useDeleteMessage() {
  return useCallback((messageId: string) => api.deleteMessage(messageId), []);
}

export function useReactMessage() {
  return useCallback((messageId: string, emoji: string) =>
    api.reactMessage(messageId, emoji), []);
}

export function useMarkConversationRead() {
  return useCallback((conversationId: string, messageId?: string) =>
    api.markConversationRead(conversationId, messageId), []);
}

// ── Phase 19: Global Search hooks ───────────────────

export function useGlobalSearch(query: string, options: { types?: SearchEntityType[]; courseId?: string; limit?: number } = {}, enabled = true) {
  return useApiQuery<GlobalSearchResult>(async () => {
    if (!enabled || !query.trim()) {
      return { query: "", total: 0, hits: [], facetCounts: emptyFacetCounts() };
    }
    return api.globalSearch(query, options);
  }, [query, JSON.stringify(options), enabled]);
}

export function useSearchAnalytics(params: { days?: number; limit?: number } = {}) {
  return useApiQuery<SearchAnalytics>(
    () => api.searchAnalytics(params),
    [JSON.stringify(params)],
  );
}

function emptyFacetCounts(): GlobalSearchResult["facetCounts"] {
  return { course: 0, lesson: 0, discussion: 0, user: 0, certificate: 0, help_article: 0 };
}

// ── Phase 20: Localization hooks ─────────────────────

export function useLocalePreference() {
  return useApiQuery<UserLocalePreference>(async () => {
    const result = await api.getLocalePreference();
    return result;
  }, []);
}

export function useUpdateLocalePreference() {
  return useCallback((input: Partial<UserLocalePreference>) => api.updateLocalePreference(input), []);
}

export function useOrgLocalePreference() {
  return useApiQuery<OrgLocalePreference | null>(async () => {
    try {
      return await api.getOrgLocalePreference();
    } catch {
      return null;
    }
  }, []);
}

export function useUpdateOrgLocalePreference() {
  return useCallback((input: Partial<OrgLocalePreference>) => api.updateOrgLocalePreference(input), []);
}

// ── Phase 20: Help Center hooks ──────────────────────

export function useHelpCategories() {
  return useApiQuery<HelpCategory[]>(async () => api.listHelpCategories(), []);
}

export function useHelpArticles(params: { q?: string; categoryId?: string; limit?: number } = {}) {
  return useApiQuery<HelpArticle[]>(() => api.listHelpArticles(params), [JSON.stringify(params)]);
}

export function useHelpArticle(id: string | null) {
  return useApiQuery<HelpArticle | null>(async () => {
    if (!id) return null;
    return api.getHelpArticle(id);
  }, [id]);
}

export function useCreateHelpArticle() {
  return useCallback(
    (input: { categoryId: string; slug: string; title: string; body: string; excerpt?: string; tags?: string[]; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) =>
      api.createHelpArticle(input),
    [],
  );
}

export function useUpdateHelpArticle() {
  return useCallback(
    (id: string, input: Partial<{ categoryId: string; slug: string; title: string; body: string; excerpt: string; tags: string[]; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }>) =>
      api.updateHelpArticle(id, input),
    [],
  );
}

export function useDeleteHelpArticle() {
  return useCallback((id: string) => api.deleteHelpArticle(id), []);
}

export function useCreateHelpCategory() {
  return useCallback(
    (input: { key: string; title: string; description?: string; icon?: string; orderIndex?: number }) =>
      api.createHelpCategory(input),
    [],
  );
}

export function useUpdateHelpCategory() {
  return useCallback(
    (id: string, input: Partial<{ key: string; title: string; description?: string; icon?: string; orderIndex?: number }>) =>
      api.updateHelpCategory(id, input),
    [],
  );
}

export function useDeleteHelpCategory() {
  return useCallback((id: string) => api.deleteHelpCategory(id), []);
}

// ── Phase 20: Support Tickets hooks ──────────────────

export function useSupportTickets(params: { status?: string; limit?: number } = {}) {
  return useApiQuery<SupportTicket[]>(() => api.listSupportTickets(params), [JSON.stringify(params)]);
}

export function useSupportTicket(id: string | null) {
  return useApiQuery<SupportTicket | null>(async () => {
    if (!id) return null;
    return api.getSupportTicket(id);
  }, [id]);
}

export function useCreateSupportTicket() {
  return useCallback(
    (input: { subject: string; body: string; category?: string; priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" }) =>
      api.createSupportTicket(input),
    [],
  );
}

export function useReplySupportTicket() {
  return useCallback(
    (id: string, body: string, isInternal = false) => api.replySupportTicket(id, body, isInternal),
    [],
  );
}

export function useUpdateSupportTicket() {
  return useCallback(
    (id: string, input: { status?: string; priority?: string; assignedToId?: string }) =>
      api.updateSupportTicket(id, input),
    [],
  );
}

// ── Phase 35: Transcript Notes hooks ─────────────────

export function useTranscriptNotes(lessonId?: string) {
  return useApiQuery<TranscriptNote[]>(
    () => api.listTranscriptNotes({ lessonId }),
    [lessonId ?? ""],
  );
}

export function useSearchTranscriptNotes(params: { q?: string; lessonId?: string; activityId?: string; tags?: string[]; limit?: number } = {}) {
  return useApiQuery<TranscriptNote[]>(
    () => api.searchTranscriptNotes(params),
    [JSON.stringify(params)],
  );
}

export function useCreateTranscriptNote() {
  return useCallback(
    (input: {
      lessonId: string;
      activityId?: string;
      timestampSeconds?: number;
      content: string;
      color?: "yellow" | "green" | "blue" | "pink" | "purple";
      tags?: string[];
    }) => api.createTranscriptNote(input),
    [],
  );
}

export function useUpdateTranscriptNote() {
  return useCallback(
    (id: string, input: Partial<{
      content: string;
      color: "yellow" | "green" | "blue" | "pink" | "purple";
      tags: string[];
      timestampSeconds: number;
    }>) => api.updateTranscriptNote(id, input),
    [],
  );
}

export function useDeleteTranscriptNote() {
  return useCallback((id: string) => api.deleteTranscriptNote(id), []);
}

export function useGenerateNoteContext() {
  return useCallback(
    (id: string, input: { providerKey?: string; candidateNoteIds?: string[] } = {}) =>
      api.generateNoteContext(id, input),
    [],
  );
}

export function useNoteContext(noteId: string | null) {
  return useApiQuery<NoteContext | null>(async () => {
    if (!noteId) return null;
    return api.getNoteContext(noteId);
  }, [noteId]);
}

export function useExportTranscriptNotes() {
  return useCallback((input: { lessonId?: string } = {}) => api.exportTranscriptNotes(input), []);
}

// ── Phase 21: Data Governance & Backup ──────────────────────

export function useLegalDocuments(query?: { type?: LegalDocumentType }) {
  return useApiQuery<LegalDocument[]>(
    () => api.listLegalDocuments(query).then((r) => r.data),
    [JSON.stringify(query ?? {})],
  );
}

export function useLatestLegalDocuments() {
  return useApiQuery<LegalDocument[]>(
    () => api.getLatestLegalDocuments().then((r) => r.data),
    [],
  );
}

export function useMyConsents() {
  return useApiQuery<ConsentRecord[]>(
    () => api.listMyConsents().then((r) => r.data),
    [],
  );
}

export function useRecordConsent() {
  return useCallback(
    (input: {
      documentType: LegalDocumentType;
      documentVersion: string;
      documentId?: string;
    }) => api.recordConsent(input),
    [],
  );
}

export function useRecordCookieConsent() {
  return useCallback(
    (input: {
      necessary: boolean;
      analytics: boolean;
      marketing: boolean;
      preferences?: boolean;
      sessionId: string;
    }) => api.recordCookieConsent(input),
    [],
  );
}

export function useRequestDataExport() {
  return useCallback((reason?: string) => api.requestDataExport(reason), []);
}

export function useRequestAnonymization() {
  return useCallback(
    (input: { confirm: boolean; reason?: string }) =>
      api.requestAnonymization(input),
    [],
  );
}

// Admin Organizations
export function useAdminOrganizations(query?: Record<string, string>) {
  return useApiQuery(async () => {
    return api.adminOrganizations(query);
  }, [JSON.stringify(query)]);
}

export function useAdminCreateOrganization() {
  return useCallback(
    (input: Record<string, unknown>) => api.adminCreateOrganization(input),
    [],
  );
}

export function useAdminUpdateOrganization() {
  return useCallback(
    (id: string, input: Record<string, unknown>) => api.adminUpdateOrganization(id, input),
    [],
  );
}

// Admin Users
export function useAdminUsers(query?: Record<string, string>) {
  return useApiQuery(async () => {
    const result = await api.adminUsers(query);
    return result;
  }, [JSON.stringify(query)]);
}

export function useAdminUser(id: string | null) {
  return useApiQuery(async () => {
    if (!id) return null;
    return api.adminUser(id);
  }, [id]);
}

export function useUpdateAdminUser() {
  return useCallback(
    (id: string, input: Record<string, unknown>) => api.updateAdminUser(id, input),
    [],
  );
}

export function useUpdateAdminUserStatus() {
  return useCallback(
    (id: string, status: string) => api.updateAdminUserStatus(id, status),
    [],
  );
}

export function useAdminDataExportRequests() {
  return useApiQuery<DataExportRequest[]>(
    () => api.listDataExportRequests().then((r) => r.data),
    [],
  );
}

export function useRetentionPolicies() {
  return useApiQuery<RetentionPolicy[]>(
    () => api.listRetentionPolicies().then((r) => r.data),
    [],
  );
}

export function useUpsertRetentionPolicy() {
  return useCallback(
    (input: {
      entityType: string;
      retentionDays: number;
      anonymize?: boolean;
      description?: string;
    }) => api.upsertRetentionPolicy(input),
    [],
  );
}

export function useBackupJobs() {
  return useApiQuery<BackupJob[]>(
    () => api.listBackupJobs().then((r) => r.data),
    [],
  );
}

export function useTriggerBackupJob() {
  return useCallback(
    (input: { type: "FULL" | "INCREMENTAL"; notes?: string }) =>
      api.triggerBackupJob(input),
    [],
  );
}

export function useCreateLegalDocument() {
  return useCallback(
    (input: {
      type: LegalDocumentType;
      version: string;
      title: string;
      content: string;
      effectiveAt: string;
      publish?: boolean;
    }) => api.createLegalDocument(input),
    [],
  );
}

export function useUpdateLegalDocument() {
  return useCallback(
    (
      id: string,
      input: {
        title?: string;
        content?: string;
        effectiveAt?: string;
        publish?: boolean;
      },
    ) => api.updateLegalDocument(id, input),
    [],
  );
}

// ── Phase 22: OAuth, MFA, Sessions ──────────────────────

export function useOAuthAccounts() {
  return useApiQuery<OAuthAccount[]>(
    () => api.listOAuthAccounts().then((r) => r.data),
    [],
  );
}

export function useUnlinkOAuthAccount() {
  return useCallback(
    (id: string) => api.unlinkOAuthAccount(id),
    [],
  );
}

export function useLinkOAuthAccount() {
  return useCallback(
    (input: {
      provider: OAuthProvider;
      profile: {
        providerUserId: string;
        email?: string;
        raw?: Record<string, unknown>;
      };
    }) => api.linkOAuthAccount(input),
    [],
  );
}

export function useMfaFactors() {
  return useApiQuery<MfaFactor[]>(
    () => api.listMfaFactors().then((r) => r.data),
    [],
  );
}

export function useEnrollMfa() {
  return useCallback((type: "TOTP" | "BACKUP_CODE") => api.enrollMfa(type), []);
}

export function useVerifyMfa() {
  return useCallback((code: string) => api.verifyMfa(code), []);
}

export function useDisableMfa() {
  return useCallback(
    (type: "TOTP" | "BACKUP_CODE") => api.disableMfa(type),
    [],
  );
}

export function useSessions() {
  return useApiQuery<RefreshSessionEntry[]>(
    () => api.listSessions().then((r) => r.data),
    [],
  );
}

export function useRevokeSession() {
  return useCallback((id: string) => api.revokeSession(id), []);
}

export function useRevokeAllSessions() {
  return useCallback(() => api.revokeAllSessions(), []);
}

// ── Phase 26: Moderation ──────────────────────

export function useModerationReports(query?: {
  targetType?: ModerationTargetType;
  status?: ModerationReportStatus;
}) {
  return useApiQuery<ModerationReport[]>(
    () => api.listModerationReports(query).then((r) => r.data),
    [JSON.stringify(query ?? {})],
  );
}

export function useUpdateModerationReport() {
  return useCallback(
    (
      id: string,
      input: { status?: ModerationReportStatus; resolution?: string },
    ) => api.updateModerationReport(id, input),
    [],
  );
}

export function useModerationActions() {
  return useApiQuery<ModerationAction[]>(
    () => api.listModerationActions().then((r) => r.data),
    [],
  );
}

export function useCreateModerationAction() {
  return useCallback(
    (input: {
      targetType: ModerationTargetType;
      targetId: string;
      actionType: ModerationActionType;
      reason: string;
      notes?: string;
    }) => api.createModerationAction(input),
    [],
  );
}

export function useContentFlags() {
  return useApiQuery<ContentFlag[]>(
    () => api.listContentFlags().then((r) => r.data),
    [],
  );
}

export function useSubmitReport() {
  return useCallback(
    (input: {
      targetType: ModerationTargetType;
      targetId: string;
      reason: string;
      description?: string;
      metadata?: Record<string, unknown>;
    }) => api.submitReport(input),
    [],
  );
}

// ── Phase 23: Cohort & Timezone hooks ──────────────────────

export function useCohorts(params: { courseId?: string; status?: Cohort["status"] } = {}) {
  return useApiQuery<Cohort[]>(
    () => api.listCohorts(params),
    [JSON.stringify(params)],
  );
}

export function useMyCohorts() {
  return useApiQuery<Cohort[]>(() => api.listMyCohorts(), []);
}

export function useCohort(id: string | null) {
  return useApiQuery<Cohort | null>(async () => {
    if (!id) return null;
    return api.getCohort(id);
  }, [id]);
}

export function useCreateCohort() {
  return useCallback(
    (input: {
      name: string;
      courseId: string;
      startAt: string;
      endAt: string;
      timezone?: string;
      maxSeats?: number;
      status?: Cohort["status"];
    }) => api.createCohort(input),
    [],
  );
}

export function useUpdateCohort() {
  return useCallback(
    (
      id: string,
      input: Partial<{
        name: string;
        startAt: string;
        endAt: string;
        timezone: string;
        maxSeats: number;
        status: Cohort["status"];
      }>,
    ) => api.updateCohort(id, input),
    [],
  );
}

export function useDeleteCohort() {
  return useCallback((id: string) => api.deleteCohort(id), []);
}

export function useAddCohortMember() {
  return useCallback(
    (cohortId: string, input: { userId: string; status?: CohortMember["status"] }) =>
      api.addCohortMember(cohortId, input),
    [],
  );
}

export function useRemoveCohortMember() {
  return useCallback(
    (cohortId: string, userId: string) => api.removeCohortMember(cohortId, userId),
    [],
  );
}

export function useCohortSchedule(cohortId: string | null) {
  return useApiQuery<CohortSchedule[]>(async () => {
    if (!cohortId) return [];
    return api.listCohortSchedule(cohortId);
  }, [cohortId]);
}

export function useAddCohortSchedule() {
  return useCallback(
    (
      cohortId: string,
      input: {
        weekday: number;
        startTime: string;
        endTime: string;
        lessonId?: string;
        meetingUrl?: string;
      },
    ) => api.addCohortSchedule(cohortId, input),
    [],
  );
}

export function useBulkAddCohortSchedule() {
  return useCallback(
    (
      cohortId: string,
      items: Array<{
        weekday: number;
        startTime: string;
        endTime: string;
        lessonId?: string;
        meetingUrl?: string;
      }>,
    ) => api.bulkAddCohortSchedule(cohortId, items),
    [],
  );
}

export function useMyTimezone() {
  return useApiQuery<UserTimezonePreference>(() => api.getMyTimezone(), []);
}

export function useUpdateMyTimezone() {
  return useCallback(
    (input: { timezone: string; autoDetect?: boolean }) =>
      api.updateMyTimezone(input),
    [],
  );
}

// ── Phase 28: Proctoring hooks ──────────────────────

export function useProctoringSessions(params: { userId?: string; status?: ProctoringSession["status"] } = {}) {
  return useApiQuery<ProctoringSession[]>(
    () => api.listProctoringSessions(params),
    [JSON.stringify(params)],
  );
}

export function useProctoringSession(id: string | null) {
  return useApiQuery<ProctoringSession | null>(async () => {
    if (!id) return null;
    return api.getProctoringSession(id);
  }, [id]);
}

export function useProctoringFlags(params: { status?: ProctoringFlagStatus; sessionId?: string } = {}) {
  return useApiQuery<ProctoringFlag[]>(
    () => api.listProctoringFlags(params),
    [JSON.stringify(params)],
  );
}

export function useStartProctoringSession() {
  return useCallback(
    (input: { attemptId: string; attemptType?: string; metadata?: Record<string, unknown> }) =>
      api.startProctoringSession(input),
    [],
  );
}

export function useIngestProctoringEvent() {
  return useCallback(
    (
      sessionId: string,
      input: { type: ProctoringEventType; severity?: ProctoringSeverity; metadata?: Record<string, unknown> },
    ) => api.ingestProctoringEvent(sessionId, input),
    [],
  );
}

export function useEndProctoringSession() {
  return useCallback((sessionId: string) => api.endProctoringSession(sessionId), []);
}

export function useReviewProctoringFlag() {
  return useCallback(
    (flagId: string, input: { status: ProctoringFlagStatus; notes?: string }) =>
      api.reviewProctoringFlag(flagId, input),
    [],
  );
}

// ── Phase 29: Payout hooks ──────────────────────

export function useRevenueShareRules() {
  return useApiQuery<RevenueShareRule[]>(() => api.listRevenueShareRules(), []);
}

export function useCreateRevenueShareRule() {
  return useCallback(
    (input: { scope: RevenueShareScope; targetId?: string; percent: number; active?: boolean }) =>
      api.createRevenueShareRule(input),
    [],
  );
}

export function useUpdateRevenueShareRule() {
  return useCallback(
    (id: string, input: { percent?: number; active?: boolean }) =>
      api.updateRevenueShareRule(id, input),
    [],
  );
}

export function usePayoutMethods() {
  return useApiQuery<PayoutMethod[]>(() => api.listPayoutMethods(), []);
}

export function useCreatePayoutMethod() {
  return useCallback(
    (input: {
      beneficiaryType: PayoutBeneficiaryType;
      beneficiaryId: string;
      type: PayoutMethodType;
      details: Record<string, unknown>;
    }) => api.createPayoutMethod(input),
    [],
  );
}

export function usePayoutPeriods() {
  return useApiQuery<PayoutPeriod[]>(() => api.listPayoutPeriods(), []);
}

export function useCreatePayoutPeriod() {
  return useCallback(
    (input: { periodStart: string; periodEnd: string; currency?: string }) =>
      api.createPayoutPeriod(input),
    [],
  );
}

export function useComputePayoutPeriod() {
  return useCallback((periodId: string) => api.computePayoutPeriod(periodId), []);
}

export function useLockPayoutPeriod() {
  return useCallback((periodId: string) => api.lockPayoutPeriod(periodId), []);
}

export function usePayPayoutPeriod() {
  return useCallback(
    (periodId: string, input: { reference?: string }) => api.payPayoutPeriod(periodId, input),
    [],
  );
}

export function useMyPayouts() {
  return useApiQuery<Payout[]>(() => api.listMyPayouts(), []);
}

// ── Phase 30: Tax hooks ──────────────────────

export function useTaxRegions() {
  return useApiQuery<TaxRegion[]>(() => api.listTaxRegions(), []);
}

export function useTaxRules() {
  return useApiQuery<TaxRule[]>(() => api.listTaxRules(), []);
}

export function useCreateTaxRule() {
  return useCallback(
    (input: {
      regionCode: string;
      rate: number;
      type: TaxRuleType;
      inclusive?: boolean;
      active?: boolean;
    }) => api.createTaxRule(input),
    [],
  );
}

export function useUpdateTaxRule() {
  return useCallback(
    (id: string, input: { rate?: number; inclusive?: boolean; active?: boolean }) =>
      api.updateTaxRule(id, input),
    [],
  );
}

export function useCalculateTax() {
  return useCallback(
    (input: {
      subtotal: number;
      regionCode: string;
      currency: SupportedCurrency;
      lines?: Array<{ productId: string; amount: number; metadata?: Record<string, unknown> }>;
    }) => api.calculateTax(input),
    [],
  );
}

// ── Phase 31: 3D Content Plugin hooks ──────────────────────

export function useThreeDAssets(params: { search?: string; format?: string } = {}) {
  return useApiQuery<ThreeDAssetRecord[]>(
    () => api.listThreeDAssets(params),
    [JSON.stringify(params)],
  );
}

export function useThreeDAsset(id: string | null) {
  return useApiQuery<ThreeDAssetRecord | null>(async () => {
    if (!id) return null;
    return api.getThreeDAsset(id);
  }, [id]);
}

export function useCreateThreeDAsset() {
  return useCallback(
    (input: {
      name: string;
      format: "GLB" | "GLTF" | "FBX" | "OBJ";
      sizeBytes?: number;
      url: string;
      thumbnailUrl?: string;
    }) => api.createThreeDAsset(input),
    [],
  );
}

export function useUpdateThreeDAsset() {
  return useCallback(
    (
      id: string,
      input: Partial<{
        name: string;
        format: "GLB" | "GLTF" | "FBX" | "OBJ";
        sizeBytes: number;
        url: string;
        thumbnailUrl: string;
      }>,
    ) => api.updateThreeDAsset(id, input),
    [],
  );
}

export function useDeleteThreeDAsset() {
  return useCallback((id: string) => api.deleteThreeDAsset(id), []);
}

export function useGenerateThreeDPreview() {
  return useCallback((id: string) => api.generateThreeDPreview(id), []);
}

export function useThreeDScenes(assetId: string | null) {
  return useApiQuery<ThreeDSceneRecord[]>(async () => {
    if (!assetId) return [];
    return api.listThreeDScenes(assetId);
  }, [assetId]);
}

export function useCreateThreeDScene() {
  return useCallback(
    (assetId: string, input: { scene: Record<string, unknown>; version?: number }) =>
      api.createThreeDScene(assetId, input),
    [],
  );
}

export function useThreeDScene(id: string | null) {
  return useApiQuery<ThreeDSceneRecord | null>(async () => {
    if (!id) return null;
    return api.getThreeDScene(id);
  }, [id]);
}

export function useAddThreeDInteraction() {
  return useCallback(
    (
      sceneId: string,
      input: { name: string; trigger: string; action: Record<string, unknown> },
    ) => api.addThreeDInteraction(sceneId, input),
    [],
  );
}

// ── Phase 32: Code Runner Plugin hooks ──────────────────────

export function useCodeExecution(id: string | null) {
  return useApiQuery<CodeExecutionRecord | null>(async () => {
    if (!id) return null;
    return api.getCodeExecution(id);
  }, [id]);
}

export function useCodeSubmissions(params: { assignmentId?: string; userId?: string } = {}) {
  return useApiQuery<CodeSubmissionRecord[]>(
    () => api.listCodeSubmissions(params),
    [JSON.stringify(params)],
  );
}

export function useExecuteCode() {
  return useCallback(
    (input: {
      language: CodeLanguage;
      code: string;
      stdin?: string;
      timeoutMs?: number;
    }) => api.executeCode(input),
    [],
  );
}

export function useJudgeCode() {
  return useCallback(
    (input: {
      assignmentId: string;
      language: CodeLanguage;
      code: string;
      testCases: Array<{ name: string; input?: string; expectedOutput: string }>;
      timeoutMs?: number;
      scoreWeight?: number;
    }) => api.judgeCode(input),
    [],
  );
}

// ── Phase 33: Plugin Marketplace Governance hooks ──────────────────────

export function usePluginListings(status?: PluginListingStatus) {
  return useApiQuery<PluginListingRecord[]>(
    () => api.listPluginListings(status),
    [status ?? ""],
  );
}

export function usePluginListing(id: string | null) {
  return useApiQuery<PluginListingRecord | null>(async () => {
    if (!id) return null;
    return api.getPluginListing(id);
  }, [id]);
}

export function useCreatePluginListing() {
  return useCallback(
    (input: {
      pluginId: string;
      name: string;
      description: string;
      longDescription?: string;
      categories?: string[];
      screenshots?: string[];
      pricing?: Record<string, unknown>;
    }) => api.createPluginListing(input),
    [],
  );
}

export function useUpdatePluginListing() {
  return useCallback(
    (
      id: string,
      input: Partial<{
        name: string;
        description: string;
        longDescription: string;
        categories: string[];
        screenshots: string[];
        pricing: Record<string, unknown>;
      }>,
    ) => api.updatePluginListing(id, input),
    [],
  );
}

export function useUpdatePluginListingStatus() {
  return useCallback(
    (id: string, status: PluginListingStatus) =>
      api.updatePluginListingStatus(id, status),
    [],
  );
}

export function usePluginReviews(listingId?: string) {
  return useApiQuery<Array<PluginReviewRecord & { reviewer: { id: string; name: string; email: string }; listing: { id: string; name: string } }>>(
    () => api.listPluginReviews(listingId),
    [listingId ?? ""],
  );
}

export function useCreatePluginReview() {
  return useCallback(
    (input: { listingId: string; rating: number; comment?: string }) =>
      api.createPluginReview(input),
    [],
  );
}

export function useUpdatePluginReviewStatus() {
  return useCallback(
    (id: string, status: PluginReviewStatus) =>
      api.updatePluginReviewStatus(id, status),
    [],
  );
}

export function usePluginInstallations() {
  return useApiQuery<PluginInstallationRecord[]>(
    () => api.listPluginInstallations(),
    [],
  );
}

export function useInstallPlugin() {
  return useCallback(
    (input: { listingId: string; config?: Record<string, unknown> }) =>
      api.installPlugin(input),
    [],
  );
}

export function useUninstallPlugin() {
  return useCallback((id: string) => api.uninstallPlugin(id), []);
}

export function usePluginPolicy() {
  return useApiQuery<PluginPolicyRecord>(() => api.getPluginPolicy(), []);
}

export function useUpdatePluginPolicy() {
  return useCallback(
    (input: { maxInstalls?: number; allowedCategories?: string[]; requireApproval?: boolean }) =>
      api.updatePluginPolicy(input),
    [],
  );
}

// ── Phase 34: Popout Dual Monitor hooks ──────────────────────

export function useIssuePopoutToken() {
  return useCallback(
    (input: { lessonId: string; ttlMs?: number }) => api.issuePopoutToken(input),
    [],
  );
}

export function useValidatePopoutToken(token: string | null) {
  return useApiQuery<PopoutValidationResponse | null>(async () => {
    if (!token) return null;
    try {
      return await api.validatePopoutToken(token);
    } catch {
      return null;
    }
  }, [token]);
}

export function useRevokePopoutToken() {
  return useCallback((token: string) => api.revokePopoutToken(token), []);
}

// ── Phase 36: Plugin Workspace Panels hooks ──────────────────────

export function useAvailablePanels() {
  return useApiQuery<PluginPanelDefinition[]>(() => api.listAvailablePanels(), []);
}

export function useRegisterPluginPanel() {
  return useCallback(
    (input: {
      pluginId: string;
      panelKey: string;
      name: string;
      defaultSize?: PanelSize;
      defaultPosition?: PanelPosition;
      allowedRoutes?: string[];
      configSchema?: Record<string, unknown>;
    }) => api.registerPluginPanel(input),
    [],
  );
}

export function usePanelLayout(layoutKey: string | null) {
  return useApiQuery<UserPanelLayoutRecord | null>(async () => {
    if (!layoutKey) return null;
    return api.getPanelLayout(layoutKey);
  }, [layoutKey]);
}

export function useSavePanelLayout() {
  return useCallback(
    (layoutKey: string, input: { panels: PanelEntry[] }) =>
      api.savePanelLayout(layoutKey, input),
    [],
  );
}
