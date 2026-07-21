"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Activity, Course } from "../../lib/lms-types";
import { activityKind } from "./workspace-config";

export function CurriculumSidebar({
  course,
  completedActivityIds,
  selectedActivityId,
  onSelectActivity,
}: {
  course: Course;
  completedActivityIds: Set<string>;
  selectedActivityId: string | null;
  onSelectActivity: (activityId: string) => void;
}) {
  const modules = useMemo(
    () =>
      (course.modules ?? []).map((module) => ({
        module,
        activities: module.lessons.flatMap((lesson) => lesson.activities),
      })),
    [course.modules],
  );

  const moduleIdForSelected = useMemo(() => {
    for (const entry of modules) {
      if (
        entry.activities.some((activity) => activity.id === selectedActivityId)
      ) {
        return entry.module.id;
      }
    }
    return modules[0]?.module.id ?? null;
  }, [modules, selectedActivityId]);

  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(moduleIdForSelected ? [moduleIdForSelected] : []),
  );

  useEffect(() => {
    if (!moduleIdForSelected) return;
    setExpandedModules((current) => {
      if (current.has(moduleIdForSelected)) return current;
      const next = new Set(current);
      next.add(moduleIdForSelected);
      return next;
    });
  }, [moduleIdForSelected]);

  function toggleModule(moduleId: string) {
    setExpandedModules((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-border bg-card max-xl:max-h-[42vh] max-xl:border-b max-xl:border-r-0 xl:max-h-none">
      <div className="shrink-0 border-b border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Curriculum
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold">
          {course.title}
        </h3>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-card">
        {modules.map((entry, index) => {
          const { module, activities } = entry;
          const completedCount = activities.filter((activity) =>
            completedActivityIds.has(activity.id),
          ).length;
          const isExpanded = expandedModules.has(module.id);
          const containsSelected = activities.some(
            (activity) => activity.id === selectedActivityId,
          );

          return (
            <section
              key={module.id}
              className="border-b border-border last:border-b-0"
            >
              <button
                aria-expanded={isExpanded}
                className={[
                  "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted",
                  containsSelected ? "bg-primary/5" : "",
                ].join(" ")}
                onClick={() => toggleModule(module.id)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
                    Module {index + 1}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-foreground">
                    {module.title}
                  </span>
                  {activities.length ? (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {completedCount}/{activities.length} completed
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={[
                    "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isExpanded ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>
              {isExpanded ? (
                <div className="space-y-1 px-3 pb-3">
                  {activities.length ? (
                    activities.map((activity) => (
                      <CurriculumActivityRow
                        key={activity.id}
                        activity={activity}
                        isCompleted={completedActivityIds.has(activity.id)}
                        isSelected={selectedActivityId === activity.id}
                        onSelect={() => onSelectActivity(activity.id)}
                      />
                    ))
                  ) : (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      No activities yet.
                    </p>
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </aside>
  );
}

function CurriculumActivityRow({
  activity,
  isCompleted,
  isSelected,
  onSelect,
}: {
  activity: Activity;
  isCompleted: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={[
        "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition",
        isSelected
          ? "bg-primary/10 text-primary ring-1 ring-primary/30"
          : "text-foreground hover:bg-muted",
      ].join(" ")}
      onClick={onSelect}
      type="button"
    >
      <span
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          isCompleted
            ? "border-success bg-success text-success-foreground"
            : "border-border bg-background text-transparent",
        ].join(" ")}
      >
        {isCompleted && (
          <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {activity.title}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {activityKind(activity)} · {activity.estimatedMinutes || 1} min
        </span>
      </span>
    </button>
  );
}
