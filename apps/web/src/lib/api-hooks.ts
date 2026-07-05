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
} from "./lms-types";
import type { ListResponse } from "./api-client";

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: ApiClientError | Error | null;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
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

  return { data, loading, error, reload, refresh };
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
