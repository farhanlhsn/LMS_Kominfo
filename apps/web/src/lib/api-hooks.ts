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
  AuthSession,
  ContentLibraryItem,
  Course,
  Enrollment,
  FileAsset,
  LearnerBookmark,
  LearnerNote,
  LearningCourseResponse,
  LearningWorkspacePreference,
  Lesson,
  LessonWorkspaceState,
  Plugin,
  PluginActivityType,
  PluginExecutionLog,
  TranscriptSegment,
  WorkspaceContext,
} from "./lms-types";

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: ApiClientError | Error | null;
  reload: () => Promise<void>;
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

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
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
  return useApiQuery<Course>(
    async () => {
      if (!slugOrId) throw new Error("Course id is required");
      return api.courseDetail(slugOrId);
    },
    [slugOrId],
  );
}

export function useCourseCurriculum(courseId: string | null) {
  return useApiQuery<Course>(
    async () => {
      if (!courseId) throw new Error("Course id is required");
      return api.courseCurriculum(courseId);
    },
    [courseId],
  );
}

export function useEnrollCourse() {
  return useCallback((courseId: string) => api.enrollCourse(courseId), []);
}

export function useMyEnrollments() {
  return useApiQuery<Enrollment[]>(() => api.myEnrollments(), []);
}

export function useLearningCourse(courseId: string | null) {
  return useApiQuery<LearningCourseResponse>(
    async () => {
      if (!courseId) throw new Error("Course id is required");
      return api.learningCourse(courseId);
    },
    [courseId],
  );
}

export function useLesson(lessonId: string | null) {
  return useApiQuery<Lesson>(
    async () => {
      if (!lessonId) throw new Error("Lesson id is required");
      return api.lesson(lessonId);
    },
    [lessonId],
  );
}

export function useActivityContent(activityId: string | null) {
  return useApiQuery<ActivityContentResponse>(
    async () => {
      if (!activityId) throw new Error("Activity id is required");
      return api.activityContent(activityId);
    },
    [activityId],
  );
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

export function useTranscript(activityId: string | null) {
  return useApiQuery<TranscriptSegment[]>(
    async () => {
      if (!activityId) throw new Error("Activity id is required");
      return api.transcript(activityId);
    },
    [activityId],
  );
}

export function useWorkspaceContext(activityId: string | null) {
  return useApiQuery<WorkspaceContext>(
    async () => {
      if (!activityId) throw new Error("Activity id is required");
      return api.workspaceContext(activityId);
    },
    [activityId],
  );
}

export function useInstructorCourses() {
  return useApiQuery<Course[]>(() => api.instructorCourses(), []);
}

export function useInstructorCourse(courseId: string | null) {
  return useApiQuery<Course>(
    async () => {
      if (!courseId) throw new Error("Course id is required");
      return api.instructorCourse(courseId);
    },
    [courseId],
  );
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
  return useApiQuery<ContentLibraryItem[]>(
    () => api.contentLibrary(),
    [],
  );
}

export function usePluginActivityTypes() {
  return useApiQuery<{ organizationId: string; activityTypes: PluginActivityType[] }>(
    () => api.pluginActivityTypes(),
    [],
  );
}

export function useAdminPlugins() {
  return useApiQuery<Plugin[]>(() => api.adminPlugins(), []);
}

export function useAdminPlugin(pluginKey: string | null) {
  return useApiQuery<Plugin>(
    async () => {
      if (!pluginKey) throw new Error("Plugin key is required");
      return api.adminPlugin(pluginKey);
    },
    [pluginKey],
  );
}

export function usePluginLogs(pluginKey: string | null) {
  return useApiQuery<PluginExecutionLog[]>(
    async () => {
      if (!pluginKey) throw new Error("Plugin key is required");
      return api.pluginLogs(pluginKey);
    },
    [pluginKey],
  );
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
