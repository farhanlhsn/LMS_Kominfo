import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  GripVertical,
  Link2,
  ListChecks,
  MessageSquare,
  PanelRight,
  PlayCircle,
  Plus,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type {
  Activity,
  ActivityTypeKey,
  Course,
  CourseModule,
  CourseStatus,
  Enrollment,
  Lesson,
} from "../../lib/lms-types";
import { cn } from "../../lib/utils";
import { ButtonLink, StatusBadge } from "../ui/core";
import { EmptyState } from "../ui/states";

const statusTone = {
  DRAFT: "neutral",
  SUBMITTED_FOR_REVIEW: "warning",
  CHANGES_REQUESTED: "danger",
  APPROVED: "info",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
} satisfies Record<
  CourseStatus,
  "neutral" | "success" | "warning" | "danger" | "info"
>;

export function activityIcon(type: ActivityTypeKey): LucideIcon {
  if (type === "core.video") return PlayCircle;
  if (type === "core.file") return ListChecks;
  if (type === "core.link") return Link2;
  if (type === "core.quiz") return ListChecks;
  return FileText;
}

export function labelize(value?: string | null) {
  if (!value) return "Not set";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function courseHref(course: Pick<Course, "id" | "slug">) {
  return `/courses/${course.slug || course.id}`;
}

export function courseMinutes(course: Course) {
  if (course.durationMinutes) return course.durationMinutes;
  return (
    course.modules?.reduce(
      (sum, module) =>
        sum +
        module.lessons.reduce(
          (lessonSum, lesson) => lessonSum + (lesson.estimatedMinutes || 0),
          0,
        ),
      0,
    ) ?? 0
  );
}

export function lessonCount(course: Course) {
  return (
    course._count?.lessons ??
    course.modules?.reduce((sum, module) => sum + module.lessons.length, 0) ??
    0
  );
}

export function activityCount(course: Course) {
  return (
    course._count?.activities ??
    course.modules?.reduce(
      (sum, module) =>
        sum +
        module.lessons.reduce(
          (lessonSum, lesson) => lessonSum + lesson.activities.length,
          0,
        ),
      0,
    ) ??
    0
  );
}

export function firstLesson(course?: Course | null) {
  return course?.modules?.flatMap((module) => module.lessons)[0] ?? null;
}

export function findLessonByActivityId(
  course: Course | null | undefined,
  activityId: string | null | undefined,
) {
  if (!course || !activityId) return null;
  return (
    course.modules
      ?.flatMap((module) => module.lessons)
      .find((lesson) =>
        lesson.activities.some((activity) => activity.id === activityId),
      ) ?? null
  );
}

export function flattenCourseActivities(course?: Course | null): Activity[] {
  return (
    course?.modules?.flatMap((module) =>
      module.lessons.flatMap((lesson) => lesson.activities),
    ) ?? []
  );
}

function isActivityCompleted(activity: Activity) {
  return activity.progress?.[0]?.status === "COMPLETED";
}

/**
 * Resolve where a learner should resume in a course.
 *
 * "Continue where you left off" means the activity right after the furthest
 * completed one, not merely the last accessed activity. This is resilient to
 * `lastActivityId` being overwritten (e.g. by auto-start on page load) and
 * matches the learner expectation of moving forward through the curriculum.
 */
export function findResumeActivity(
  course: Course | null | undefined,
  lastActivityId?: string | null,
): Activity | null {
  const activities = flattenCourseActivities(course);
  if (!activities.length) return null;
  let lastCompletedIndex = -1;
  activities.forEach((activity, index) => {
    if (isActivityCompleted(activity)) lastCompletedIndex = index;
  });
  const lastActivityIndex = lastActivityId
    ? activities.findIndex((activity) => activity.id === lastActivityId)
    : -1;
  const resumeIndex = Math.min(
    Math.max(lastCompletedIndex + 1, lastActivityIndex, 0),
    activities.length - 1,
  );
  return activities[resumeIndex] ?? null;
}

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return <StatusBadge tone={statusTone[status]} value={labelize(status)} />;
}

export function CourseActivityTypeBadge({
  type,
}: {
  type: ActivityTypeKey;
}) {
  return <StatusBadge value={type} />;
}

export function Meter({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={safeValue}
      className="h-2 overflow-hidden rounded-full bg-muted"
      role="progressbar"
    >
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5 text-card-foreground shadow-subtle">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {course.category?.name ?? "General"} / {labelize(course.level)}
          </p>
          <h2 className="mt-2 text-lg font-semibold">{course.title}</h2>
        </div>
        <CourseStatusBadge status={course.status} />
      </div>
      <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
        {course.description || course.subtitle || "No description provided."}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <BookOpen aria-hidden="true" className="h-4 w-4 text-primary" />
          {lessonCount(course)} lessons
        </span>
        <span className="flex items-center gap-2">
          <Clock aria-hidden="true" className="h-4 w-4 text-primary" />
          {courseMinutes(course)} min
        </span>
      </div>
      <Link
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        href={courseHref(course)}
      >
        View details
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </article>
  );
}

export function CourseProgressCard({
  enrollment,
}: {
  enrollment: Enrollment;
}) {
  const course = enrollment.course;
  const resumeActivity = findResumeActivity(course, enrollment.lastActivityId);
  const resumeLesson =
    findLessonByActivityId(course, resumeActivity?.id) ??
    findLessonByActivityId(course, enrollment.lastActivityId) ??
    firstLesson(course);
  const resumeHref = resumeLesson
    ? `/learn/lessons/${resumeLesson.id}`
    : `/learn/courses/${course.id}`;

  return (
    <article className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-subtle">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {course.category?.name ?? "General"}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{course.title}</h2>
        </div>
        <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-success" />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {course.description || course.subtitle || "Continue this course."}
      </p>
      <div className="mt-5">
        <Meter value={enrollment.progressPercent} />
        <p className="mt-2 text-sm text-muted-foreground">
          {Math.round(enrollment.progressPercent)}% complete
        </p>
      </div>
      <ButtonLink className="mt-5" href={resumeHref}>
        Continue
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </ButtonLink>
      {resumeLesson ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Resume: {resumeLesson.title}
        </p>
      ) : null}
      {enrollment.lastAccessedAt ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Last accessed {new Date(enrollment.lastAccessedAt).toLocaleString()}
        </p>
      ) : null}
    </article>
  );
}

export function CourseBuilderShell({
  course,
  children,
  aside,
}: {
  course: Course;
  children: ReactNode;
  aside: ReactNode;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <article className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-subtle">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {course.category?.name ?? "General"}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{course.title}</h2>
          </div>
          <CourseStatusBadge status={course.status} />
        </div>
        <div className="mt-5">{children}</div>
      </article>
      <aside className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-subtle">
        {aside}
      </aside>
    </section>
  );
}

export function CurriculumBuilder({ course }: { course: Course }) {
  if (!course.modules?.length) {
    return (
      <EmptyState
        title="No modules yet"
        description="Add a module, lesson, and activity before publishing this course."
      />
    );
  }

  return (
    <div className="space-y-4">
      {course.modules.map((module, moduleIndex) => (
        <ModuleBuilder key={module.id} module={module} index={moduleIndex} />
      ))}
    </div>
  );
}

export function ModuleBuilder({
  module,
  index,
}: {
  module: CourseModule;
  index: number;
}) {
  return (
    <article className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GripVertical
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Module {index + 1}
            </p>
            <h3 className="text-base font-semibold">{module.title}</h3>
          </div>
        </div>
        <Plus aria-hidden="true" className="h-4 w-4 text-primary" />
      </div>

      <div className="mt-4 grid gap-3">
        {module.lessons.map((lesson, lessonIndex) => (
          <LessonSummary key={lesson.id} lesson={lesson} index={lessonIndex} />
        ))}
      </div>
    </article>
  );
}

export function LessonSummary({
  lesson,
  index,
}: {
  lesson: Lesson;
  index: number;
}) {
  return (
    <section className="rounded-md border border-border px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lesson {index + 1}
          </p>
          <h4 className="font-medium">{lesson.title}</h4>
        </div>
        <span className="text-xs text-muted-foreground">
          {lesson.estimatedMinutes} min
        </span>
      </div>
      <ActivityList lesson={lesson} />
    </section>
  );
}

export function LessonPlayerLayout({
  lesson,
  children,
  aside,
}: {
  lesson: Lesson;
  children: ReactNode;
  aside: ReactNode;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <article className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-subtle">
        <h2 className="text-lg font-semibold">{lesson.title}</h2>
        <div className="mt-5">{children}</div>
      </article>
      <aside className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-subtle">
        {aside}
      </aside>
    </section>
  );
}

export function LearningWorkspaceShell({
  course,
  activeLesson,
  activeActivityId,
  children,
}: {
  course: Course;
  activeLesson: Lesson;
  activeActivityId?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid min-h-[620px] gap-4 xl:grid-cols-[280px_1fr_320px]">
      <CurriculumSidebar
        course={course}
        activeLessonId={activeLesson.id}
        activeActivityId={activeActivityId}
      />
      <main className="rounded-lg border border-border bg-card p-5 shadow-subtle">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Learning activity
            </p>
            <h2 className="mt-1 text-lg font-semibold">{activeLesson.title}</h2>
          </div>
          <StatusBadge value={`${activeLesson.estimatedMinutes} min`} />
        </div>
        <div className="mt-5">{children}</div>
      </main>
      <LearningRightPanel />
    </section>
  );
}

function activityKindLabel(type: ActivityTypeKey): string {
  if (type === "core.video") return "Video";
  if (type === "core.text") return "Reading";
  if (type === "core.file") return "File";
  if (type === "core.quiz") return "Quiz";
  if (type === "core.link") return "Link / Lab";
  return "Activity";
}

export function CurriculumSidebar({
  course,
  activeLessonId,
  activeActivityId,
}: {
  course: Course;
  activeLessonId?: string;
  activeActivityId?: string;
}) {
  const modules = (course.modules ?? []).map((module) => ({
    module,
    activities: module.lessons.flatMap((lesson) => lesson.activities),
  }));

  return (
    <aside className="rounded-lg border border-border bg-card shadow-subtle">
      <div className="border-b border-border p-4">
        <p className="text-sm font-semibold">{course.title}</p>
      </div>
      <div className="divide-y divide-border">
        {modules.map((entry, index) => {
          const { module, activities } = entry;
          const completedCount = activities.filter((activity) =>
            isActivityCompleted(activity),
          ).length;

          return (
            <section key={module.id} className="p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Module {index + 1}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {module.title}
                </p>
                {activities.length ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {completedCount}/{activities.length} completed
                  </p>
                ) : null}
              </div>
              <div className="mt-3 space-y-1">
                {activities.length ? (
                  activities.map((activity) => {
                    const isActive =
                      activeActivityId === activity.id ||
                      (!activeActivityId && activeLessonId === activity.lessonId);
                    const completed = isActivityCompleted(activity);

                    return (
                      <Link
                        key={activity.id}
                        className={cn(
                          "flex items-start gap-3 rounded-md px-3 py-2 text-left transition",
                          isActive
                            ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                            : "text-foreground hover:bg-muted",
                        )}
                        href={`/learn/lessons/${activity.lessonId}?activity=${activity.id}`}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                            completed
                              ? "border-success bg-success text-success-foreground"
                              : "border-border bg-background text-transparent",
                          )}
                        >
                          <CheckCircle2
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {activity.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {activityKindLabel(activity.activityTypeKey)} ·{" "}
                            {activity.estimatedMinutes || 1} min
                          </span>
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    No activities yet.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}

export function LearningRightPanel() {
  const panels = [
    { label: "Notes", icon: FileText },
    { label: "Transcript", icon: ListChecks },
    { label: "Discussion", icon: MessageSquare },
    { label: "Resources", icon: PanelRight },
  ];

  return (
    <aside className="rounded-lg border border-border bg-card p-4 shadow-subtle">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Workspace panels</p>
        <PanelRight aria-hidden="true" className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-4 grid gap-2">
        {panels.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground"
            type="button"
          >
            <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
            {label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Panels are prepared for future learning workspace features.
      </p>
    </aside>
  );
}

export function ActivityList({ lesson }: { lesson: Lesson }) {
  if (!lesson.activities.length) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        No activities in this lesson yet.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {lesson.activities.map((activity) => {
        const Icon = activityIcon(activity.activityTypeKey);

        return (
          <div
            key={activity.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
              <span>{activity.title}</span>
            </span>
            <CourseActivityTypeBadge type={activity.activityTypeKey} />
          </div>
        );
      })}
    </div>
  );
}

export function ActivityTypeLegend() {
  const activityTypes: Array<[string, LucideIcon]> = [
    ["core.text", FileText],
    ["core.video", Video],
    ["core.file", ListChecks],
    ["core.link", Link2],
    ["core.quiz", ListChecks],
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {activityTypes.map(([label, Icon]) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
        >
          <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
          <span className="font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function ActivityRenderer({ activity }: { activity?: Activity }) {
  if (!activity) {
    return (
      <EmptyState
        className="bg-card"
        title="No activity selected"
        description="Choose a lesson activity from the curriculum sidebar."
      />
    );
  }

  const Icon = activityIcon(activity.activityTypeKey);

  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <Icon aria-hidden="true" className="h-6 w-6 text-primary" />
      <h2 className="mt-4 text-lg font-semibold">{activity.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {activity.description || activity.activityTypeKey}
      </p>
    </article>
  );
}
