'use client';

import React, { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { LessonSidebar } from '@/components/learn/lesson-sidebar';
import { LessonContent } from '@/components/learn/lesson-content';
import { AiPanel } from '@/components/learn/ai-panel';

interface LessonContentData {
  markdown?: string | null;
  videoUrl?: string | null;
  youtubeUrl?: string | null;
  pdfUrl?: string | null;
  externalUrl?: string | null;
}

interface Lesson {
  id: string;
  title: string;
  order: number;
  type: string;
  duration: number;
  isPreview: boolean;
  moduleId: string;
  content: LessonContentData | null;
  module: {
    id: string;
    courseId: string;
    title: string;
  };
}

interface CourseProgress {
  enrollmentId: string;
  progressPercent: number;
  completedLessons: string[];
  progress: any[];
}

interface CourseDetails {
  id: string;
  title: string;
  modules: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
      order: number;
      type: string;
      duration: number;
      isPreview: boolean;
    }[];
  }[];
}

export default function LearnPage(props: { params: Promise<{ lessonId: string }> }): React.ReactElement {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { lessonId } = use(props.params);

  // 1. Fetch current lesson details (endpoint langsung /lessons/:id per API Contract)
  const {
    data: lesson,
    isLoading: isLoadingLesson,
    error: lessonError,
  } = useQuery<Lesson>({
    queryKey: ['lesson', lessonId],
    queryFn: () => api.get(`/lessons/${lessonId}`),
  });

  const courseId = lesson?.module.courseId;

  // 2. Fetch full course details for sidebar navigation
  const {
    data: course,
    isLoading: isLoadingCourse,
  } = useQuery<CourseDetails>({
    queryKey: ['course-curriculum', courseId],
    queryFn: () => api.get(`/courses/${courseId}`),
    enabled: !!courseId,
  });

  // 3. Fetch progress details
  const {
    data: progressData,
    isLoading: isLoadingProgress,
  } = useQuery<CourseProgress>({
    queryKey: ['course-progress', courseId],
    queryFn: () => api.get(`/courses/${courseId}/progress`),
    enabled: !!courseId,
  });

  // 4. Mutation to mark lesson as complete
  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/courses/${courseId}/progress`, {
        lessonId,
        completed: true,
      }),
    onSuccess: () => {
      // Invalidate queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['course-progress', courseId] });
    },
  });

  if (isLoadingLesson) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Memuat materi pembelajaran...</p>
        </div>
      </div>
    );
  }

  if (lessonError || !lesson) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center p-6 border rounded-lg bg-card max-w-sm">
          <p className="text-red-500 font-semibold">Materi tidak ditemukan atau terjadi kesalahan.</p>
          <p className="text-xs text-muted-foreground mt-2">Pastikan tautan atau akses Anda valid.</p>
        </div>
      </div>
    );
  }

  const isCompleted = progressData?.completedLessons.includes(lessonId) || false;

  return (
    <div className="flex bg-background text-foreground h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Navigation Sidebar */}
      {course && progressData && (
        <LessonSidebar
          courseTitle={course.title}
          courseId={course.id}
          modules={course.modules}
          currentLessonId={lessonId}
          completedLessonIds={progressData.completedLessons}
        />
      )}

      {/* Middle Learning Area */}
      <main className="flex-1 overflow-y-auto p-8 bg-muted/20">
        <LessonContent
          lessonId={lessonId}
          title={lesson.title}
          type={lesson.type}
          content={lesson.content}
          onComplete={() => mutation.mutate()}
          isCompleted={isCompleted}
          isCompleting={mutation.isPending}
        />
      </main>

      {/* Right AI Conversation Panel */}
      <AiPanel lessonId={lessonId} />
    </div>
  );
}
