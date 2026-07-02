'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CheckCircle2, PlayCircle, FileText, HelpCircle, Link as LinkIcon, Lock } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  order: number;
  type: string;
  duration: number;
  isPreview: boolean;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface LessonSidebarProps {
  courseTitle: string;
  courseId: string;
  modules: Module[];
  currentLessonId: string;
  completedLessonIds: string[];
}

export function LessonSidebar({
  courseTitle,
  courseId,
  modules,
  currentLessonId,
  completedLessonIds,
}: LessonSidebarProps) {
  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return PlayCircle;
      case 'QUIZ':
        return HelpCircle;
      default:
        return FileText;
    }
  };

  return (
    <aside className="w-80 border-r bg-card flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-4 border-b bg-muted/40">
        <Link href={`/courses`} className="text-xs text-primary hover:underline font-medium">
          ← Kembali ke Kursus
        </Link>
        <h2 className="text-base font-bold text-foreground mt-2 line-clamp-2">{courseTitle}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {modules.map((mod, modIdx) => (
          <div key={mod.id} className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Modul {modIdx + 1}: {mod.title}
            </h3>
            <ul className="space-y-1">
              {mod.lessons.map((lesson) => {
                const isActive = lesson.id === currentLessonId;
                const isCompleted = completedLessonIds.includes(lesson.id);
                const Icon = getLessonIcon(lesson.type);

                return (
                  <li key={lesson.id}>
                    <Link href={`/learn/${lesson.id}`}>
                      <div
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary-foreground' : 'text-green-500')} />
                        ) : (
                          <Icon className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate flex-1">{lesson.title}</span>
                        {lesson.duration > 0 && (
                          <span className={cn('text-xs shrink-0', isActive ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                            {lesson.duration}m
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
