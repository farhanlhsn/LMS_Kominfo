"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Save, Send } from "lucide-react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { RichTextEditor } from "../../../../../components/content/content";
import { AppShell } from "../../../../../components/layout/shells";
import {
  ActivityTypeLegend,
  CourseBuilderShell,
} from "../../../../../components/lms/courses";
import { PluginActivityEditor } from "../../../../../components/plugins/plugin-activity";
import {
  ButtonLink,
  ConfirmDialog,
  FormSection,
  PageHeader,
  StatusBadge,
} from "../../../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../../../components/ui/states";
import { api } from "../../../../../lib/api-client";
import {
  useContentLibrary,
  useFiles,
  useInstructorCourse,
  useInstructorQuizzes,
  usePluginActivityTypes,
  useSession,
} from "../../../../../lib/api-hooks";
import { hasPermission } from "../../../../../lib/authz";
import type {
  Activity,
  Course,
  CourseModule,
  Lesson,
} from "../../../../../lib/lms-types";

export default function BuilderPage() {
  const params = useParams<{ courseId: string }>();
  const courseQuery = useInstructorCourse(params.courseId);
  const filesQuery = useFiles();
  const libraryQuery = useContentLibrary();
  const activityTypesQuery = usePluginActivityTypes();
  const quizzesQuery = useInstructorQuizzes();
  const session = useSession();
  const course = courseQuery.data;
  const canCreate = hasPermission(session, PERMISSIONS.coursesCreate);
  const canUpdate = hasPermission(session, PERMISSIONS.coursesUpdate);
  const canPublish = hasPermission(session, PERMISSIONS.coursesPublish);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const activities = useMemo(
    () =>
      course?.modules?.flatMap((module) =>
        module.lessons.flatMap((lesson) => lesson.activities),
      ) ?? [],
    [course],
  );
  const selectedActivity =
    activities.find((activity) => activity.id === selectedActivityId) ??
    activities[0] ??
    null;

  async function run(action: () => Promise<unknown>, success: string) {
    setMessage(null);
    try {
      await action();
      setMessage(success);
      await courseQuery.reload();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        {courseQuery.loading ? (
          <LoadingState title="Loading builder" />
        ) : courseQuery.error || !course ? (
          <ApiErrorState
            error={courseQuery.error}
            fallbackTitle="Could not load builder"
            fallbackDescription="Course was not found."
          />
        ) : (
          <>
            <PageHeader
              breadcrumbs={[
                { label: "Instructor", href: "/instructor/courses" },
                { label: course.title },
              ]}
              eyebrow="Instructor builder"
              title={course.title}
              description="Build modules, lessons, extensible activities, and reusable content."
              actions={
                <ButtonLink
                  href={`/instructor/courses/${course.id}/edit`}
                  variant="secondary"
                >
                  Edit profile
                </ButtonLink>
              }
            />

            <CourseBuilderShell
              course={course}
              aside={
                <>
                  <p className="text-sm font-medium text-muted-foreground">
                    Publish readiness
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    Course structure
                  </h2>
                  <div className="mt-4 space-y-3">
                    {[
                      `${course.modules?.length ?? 0} modules`,
                      `${activities.length} activities`,
                      course.status === "PUBLISHED"
                        ? "Published"
                        : "Draft or review state",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {canPublish ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                        disabled={course.status === "PUBLISHED"}
                        onClick={() =>
                          void run(
                            () => api.publishCourse(course.id),
                            "Course published.",
                          )
                        }
                        type="button"
                      >
                        <Send aria-hidden="true" className="h-4 w-4" />
                        {course.status === "PUBLISHED" ? "Published" : "Publish"}
                      </button>
                    ) : (
                      <span className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm font-medium text-warning">
                        Publish requires reviewer or manager permission
                      </span>
                    )}
                    <ButtonLink
                      href={`/instructor/courses/${course.id}/preview`}
                      variant="secondary"
                    >
                      Preview
                    </ButtonLink>
                    {canCreate ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                        onClick={() =>
                          void run(
                            () => api.duplicateCourse(course.id),
                            "Course duplicated.",
                          )
                        }
                        type="button"
                      >
                        Duplicate
                      </button>
                    ) : null}
                    {canPublish ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                        onClick={() =>
                          void run(
                            () => api.archiveCourse(course.id),
                            "Course archived.",
                          )
                        }
                        type="button"
                      >
                        Archive
                      </button>
                    ) : null}
                    {canUpdate ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Delete this course? This hides it from instructor and learner views.",
                            )
                          ) {
                            void run(
                              () => api.deleteCourse(course.id),
                              "Course deleted.",
                            ).then(() => {
                              window.location.href = "/instructor/courses";
                            });
                          }
                        }}
                        type="button"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-5">
                    <ConfirmDialog
                      title="Publishing uses backend validation"
                      description="Visibility, RBAC, and tenant checks are enforced by the API."
                    />
                  </div>
                  {message ? (
                    <p className="mt-4 text-sm text-muted-foreground">{message}</p>
                  ) : null}
                </>
              }
            >
              <div className="grid gap-5">
                <CreateModuleForm
                  onCreate={(title, description) =>
                    run(
                      () => api.createModule(course.id, { title, description }),
                      "Module created.",
                    )
                  }
                />

                {course.modules?.length ? (
                  <ManageCurriculum
                    course={course}
                    onDeleteActivity={(activityId) =>
                      run(
                        () => api.deleteActivity(activityId),
                        "Activity deleted.",
                      )
                    }
                    onDeleteLesson={(lessonId) =>
                      run(() => api.deleteLesson(lessonId), "Lesson deleted.")
                    }
                    onDeleteModule={(moduleId) =>
                      run(() => api.deleteModule(moduleId), "Module deleted.")
                    }
                    onUpdateActivity={(activityId, input) =>
                      run(
                        () => api.updateActivity(activityId, input),
                        "Activity updated.",
                      )
                    }
                    onUpdateLesson={(lessonId, input) =>
                      run(
                        () => api.updateLesson(lessonId, input),
                        "Lesson updated.",
                      )
                    }
                    onUpdateModule={(moduleId, input) =>
                      run(
                        () => api.updateModule(moduleId, input),
                        "Module updated.",
                      )
                    }
                  />
                ) : (
                  <EmptyState
                    title="No curriculum yet"
                    description="Create the first module and lesson before publishing."
                  />
                )}

                {course.modules?.map((module) => (
                  <CreateLessonForm
                    key={module.id}
                    moduleTitle={module.title}
                    onCreate={(title, summary, estimatedMinutes) =>
                      run(
                        () =>
                          api.createLesson(module.id, {
                            title,
                            summary,
                            estimatedMinutes,
                          }),
                        "Lesson created.",
                      )
                    }
                  />
                ))}

                {course.modules?.flatMap((module) =>
                  module.lessons.map((lesson) => (
                    <CreateActivityForm
                      key={lesson.id}
                      activityTypes={activityTypesQuery.data?.activityTypes ?? []}
                      lessonTitle={lesson.title}
                      onCreate={(title, activityTypeKey, description) =>
                        run(
                          () =>
                            api.createActivity(lesson.id, {
                              title,
                              activityTypeKey,
                              description,
                              isRequired: true,
                            }),
                          "Activity created.",
                        )
                      }
                    />
                  )),
                )}
              </div>
            </CourseBuilderShell>

            <section className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <FormSection
                title="Activity content"
                description="Save rich text or external URLs to the selected activity."
              >
                <ActivitySelector
                  activities={activities}
                  selectedActivity={selectedActivity}
                  onSelect={setSelectedActivityId}
                />
                {selectedActivity ? (
                  <ActivityContentForm
                    activity={selectedActivity}
                    fileOptions={filesQuery.data?.data ?? []}
                    libraryOptions={libraryQuery.data ?? []}
                    quizOptions={quizzesQuery.data ?? []}
                    onAttachFile={(fileId) =>
                      run(
                        () => api.attachFileToActivity(selectedActivity.id, fileId),
                        "File attached.",
                      )
                    }
                    onAttachLibraryItem={(libraryItemId) =>
                      run(
                        () =>
                          api.attachLibraryItemToActivity(
                            selectedActivity.id,
                            libraryItemId,
                          ),
                        "Library item attached.",
                      )
                    }
                    onAttachQuiz={(quizId) =>
                      run(
                        () => api.attachQuizToActivity(selectedActivity.id, quizId),
                        "Quiz attached.",
                      )
                    }
                    onSave={(input) =>
                      run(
                        () => api.updateActivityContent(selectedActivity.id, input),
                        "Activity content saved.",
                      )
                    }
                  />
                ) : null}
              </FormSection>

              <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                <p className="text-sm font-medium text-muted-foreground">
                  Activity renderer keys
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  Plugin-ready activity types
                </h2>
                <div className="mt-4">
                  <ActivityTypeLegend />
                </div>
              </section>
            </section>
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}

function ManageCurriculum({
  course,
  onUpdateModule,
  onDeleteModule,
  onUpdateLesson,
  onDeleteLesson,
  onUpdateActivity,
  onDeleteActivity,
}: {
  course: Course;
  onUpdateModule: (
    moduleId: string,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  onDeleteModule: (moduleId: string) => Promise<unknown>;
  onUpdateLesson: (
    lessonId: string,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  onDeleteLesson: (lessonId: string) => Promise<unknown>;
  onUpdateActivity: (
    activityId: string,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  onDeleteActivity: (activityId: string) => Promise<unknown>;
}) {
  return (
    <div className="grid gap-4">
      {course.modules?.map((module, moduleIndex) => (
        <ModuleEditor
          key={module.id}
          module={module}
          moduleIndex={moduleIndex}
          onDeleteActivity={onDeleteActivity}
          onDeleteLesson={onDeleteLesson}
          onDeleteModule={onDeleteModule}
          onUpdateActivity={onUpdateActivity}
          onUpdateLesson={onUpdateLesson}
          onUpdateModule={onUpdateModule}
        />
      ))}
    </div>
  );
}

function ModuleEditor({
  module,
  moduleIndex,
  onUpdateModule,
  onDeleteModule,
  onUpdateLesson,
  onDeleteLesson,
  onUpdateActivity,
  onDeleteActivity,
}: {
  module: CourseModule;
  moduleIndex: number;
  onUpdateModule: (
    moduleId: string,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  onDeleteModule: (moduleId: string) => Promise<unknown>;
  onUpdateLesson: (
    lessonId: string,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  onDeleteLesson: (lessonId: string) => Promise<unknown>;
  onUpdateActivity: (
    activityId: string,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  onDeleteActivity: (activityId: string) => Promise<unknown>;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await onUpdateModule(module.id, {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      isPublished: data.get("isPublished") === "on",
    });
  }

  return (
    <article className="rounded-lg border border-border p-4">
      <form className="grid gap-3" onSubmit={submit}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Module {moduleIndex + 1}
          </p>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              className="h-4 w-4"
              defaultChecked={module.isPublished}
              name="isPublished"
              type="checkbox"
            />
            Published
          </label>
        </div>
        <input
          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
          defaultValue={module.title}
          minLength={2}
          name="title"
          required
        />
        <input
          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
          defaultValue={module.description ?? ""}
          name="description"
        />
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            type="submit"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            Save module
          </button>
          <button
            className="rounded-md border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (window.confirm("Delete this module and its lessons?")) {
                void onDeleteModule(module.id);
              }
            }}
            type="button"
          >
            Delete module
          </button>
        </div>
      </form>

      <div className="mt-4 grid gap-3">
        {module.lessons.map((lesson, lessonIndex) => (
          <LessonEditor
            key={lesson.id}
            lesson={lesson}
            lessonIndex={lessonIndex}
            onDeleteActivity={onDeleteActivity}
            onDeleteLesson={onDeleteLesson}
            onUpdateActivity={onUpdateActivity}
            onUpdateLesson={onUpdateLesson}
          />
        ))}
      </div>
    </article>
  );
}

function LessonEditor({
  lesson,
  lessonIndex,
  onUpdateLesson,
  onDeleteLesson,
  onUpdateActivity,
  onDeleteActivity,
}: {
  lesson: Lesson;
  lessonIndex: number;
  onUpdateLesson: (
    lessonId: string,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  onDeleteLesson: (lessonId: string) => Promise<unknown>;
  onUpdateActivity: (
    activityId: string,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  onDeleteActivity: (activityId: string) => Promise<unknown>;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await onUpdateLesson(lesson.id, {
      title: String(data.get("title") ?? ""),
      summary: String(data.get("summary") ?? ""),
      estimatedMinutes: Number(data.get("estimatedMinutes") ?? 0),
      isPublished: data.get("isPublished") === "on",
      isPreview: data.get("isPreview") === "on",
    });
  }

  return (
    <section className="rounded-md border border-border px-3 py-3">
      <form className="grid gap-3" onSubmit={submit}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lesson {lessonIndex + 1}
          </p>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                className="h-4 w-4"
                defaultChecked={lesson.isPublished}
                name="isPublished"
                type="checkbox"
              />
              Published
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                className="h-4 w-4"
                defaultChecked={Boolean(lesson.isPreview)}
                name="isPreview"
                type="checkbox"
              />
              Preview
            </label>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_140px]">
          <input
            className="h-10 rounded-md border border-input bg-card px-3 text-sm"
            defaultValue={lesson.title}
            minLength={2}
            name="title"
            required
          />
          <input
            className="h-10 rounded-md border border-input bg-card px-3 text-sm"
            defaultValue={lesson.estimatedMinutes}
            min={0}
            name="estimatedMinutes"
            type="number"
          />
        </div>
        <input
          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
          defaultValue={lesson.summary ?? ""}
          name="summary"
        />
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            type="submit"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            Save lesson
          </button>
          <button
            className="rounded-md border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (window.confirm("Delete this lesson and its activities?")) {
                void onDeleteLesson(lesson.id);
              }
            }}
            type="button"
          >
            Delete lesson
          </button>
        </div>
      </form>

      <div className="mt-3 grid gap-2">
        {lesson.activities.map((activity) => (
          <ActivityEditor
            key={activity.id}
            activity={activity}
            onDeleteActivity={onDeleteActivity}
            onUpdateActivity={onUpdateActivity}
          />
        ))}
      </div>
    </section>
  );
}

function ActivityEditor({
  activity,
  onUpdateActivity,
  onDeleteActivity,
}: {
  activity: Activity;
  onUpdateActivity: (
    activityId: string,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  onDeleteActivity: (activityId: string) => Promise<unknown>;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await onUpdateActivity(activity.id, {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      isRequired: data.get("isRequired") === "on",
      isPublished: data.get("isPublished") === "on",
    });
  }

  return (
    <form className="rounded-md border border-border p-3" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="text-sm font-medium">
          Activity
          <input
            className="mt-2 h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
            defaultValue={activity.title}
            minLength={2}
            name="title"
            required
          />
        </label>
        <label className="text-sm font-medium">
          Description
          <input
            className="mt-2 h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
            defaultValue={activity.description ?? ""}
            name="description"
          />
        </label>
        <StatusBadge value={activity.activityTypeKey} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input
            className="h-4 w-4"
            defaultChecked={activity.isRequired}
            name="isRequired"
            type="checkbox"
          />
          Required
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input
            className="h-4 w-4"
            defaultChecked={activity.isPublished}
            name="isPublished"
            type="checkbox"
          />
          Published
        </label>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          type="submit"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          Save
        </button>
        <button
          className="rounded-md border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
          onClick={() => {
            if (window.confirm("Delete this activity?")) {
              void onDeleteActivity(activity.id);
            }
          }}
          type="button"
        >
          Delete
        </button>
      </div>
    </form>
  );
}

function CreateModuleForm({
  onCreate,
}: {
  onCreate: (title: string, description: string) => Promise<unknown>;
}) {
  return (
    <MiniForm
      buttonLabel="Add module"
      fields={[
        ["title", "Module title"],
        ["description", "Description"],
      ]}
      onSubmit={(data) =>
        onCreate(String(data.get("title") ?? ""), String(data.get("description") ?? ""))
      }
      title="New module"
    />
  );
}

function CreateLessonForm({
  moduleTitle,
  onCreate,
}: {
  moduleTitle: string;
  onCreate: (
    title: string,
    summary: string,
    estimatedMinutes: number,
  ) => Promise<unknown>;
}) {
  return (
    <MiniForm
      buttonLabel="Add lesson"
      fields={[
        ["title", "Lesson title"],
        ["summary", "Summary"],
        ["estimatedMinutes", "Estimated minutes"],
      ]}
      onSubmit={(data) =>
        onCreate(
          String(data.get("title") ?? ""),
          String(data.get("summary") ?? ""),
          Number(data.get("estimatedMinutes") ?? 0),
        )
      }
      title={`New lesson in ${moduleTitle}`}
    />
  );
}

function CreateActivityForm({
  lessonTitle,
  activityTypes,
  onCreate,
}: {
  lessonTitle: string;
  activityTypes: Array<{
    key: string;
    name: string;
    implemented?: boolean;
    placeholder?: boolean;
  }>;
  onCreate: (
    title: string,
    activityTypeKey: string,
    description: string,
  ) => Promise<unknown>;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await onCreate(
      String(data.get("title") ?? ""),
      String(data.get("activityTypeKey") ?? "core.text"),
      String(data.get("description") ?? ""),
    );
    event.currentTarget.reset();
  }

  return (
    <form className="rounded-lg border border-border p-4" onSubmit={submit}>
      <h3 className="text-sm font-semibold">New activity in {lessonTitle}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <input
          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
          minLength={2}
          name="title"
          placeholder="Activity title"
          required
        />
        <select
          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
          name="activityTypeKey"
        >
          {(activityTypes.length
            ? activityTypes.filter(
                (activityType) =>
                  activityType.implemented !== false &&
                  !activityType.placeholder,
              )
            : [
                { key: "core.text", name: "Text" },
                { key: "core.video", name: "Video" },
                { key: "core.file", name: "File" },
                { key: "core.link", name: "Link" },
              ]
          ).map((activityType) => (
            <option key={activityType.key} value={activityType.key}>
              {activityType.name}
            </option>
          ))}
        </select>
        <input
          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
          name="description"
          placeholder="Description"
        />
      </div>
      <button
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        type="submit"
      >
        <Save aria-hidden="true" className="h-4 w-4" />
        Add activity
      </button>
    </form>
  );
}

function MiniForm({
  title,
  fields,
  buttonLabel,
  onSubmit,
}: {
  title: string;
  fields: Array<[string, string]>;
  buttonLabel: string;
  onSubmit: (data: FormData) => Promise<unknown>;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(new FormData(event.currentTarget));
    event.currentTarget.reset();
  }

  return (
    <form className="rounded-lg border border-border p-4" onSubmit={submit}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {fields.map(([name, placeholder]) => (
          <input
            key={name}
            className="h-10 rounded-md border border-input bg-card px-3 text-sm"
            minLength={name === "title" ? 2 : undefined}
            name={name}
            placeholder={placeholder}
            required={name === "title"}
            type={name === "estimatedMinutes" ? "number" : "text"}
          />
        ))}
      </div>
      <button
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        type="submit"
      >
        <Save aria-hidden="true" className="h-4 w-4" />
        {buttonLabel}
      </button>
    </form>
  );
}

function ActivitySelector({
  activities,
  selectedActivity,
  onSelect,
}: {
  activities: Activity[];
  selectedActivity: Activity | null;
  onSelect: (activityId: string) => void;
}) {
  if (!activities.length) {
    return (
      <EmptyState
        title="No activities"
        description="Create an activity before adding content."
      />
    );
  }

  return (
    <select
      className="h-11 rounded-md border border-input bg-card px-3 text-sm"
      onChange={(event) => onSelect(event.target.value)}
      value={selectedActivity?.id ?? ""}
    >
      {activities.map((activity) => (
        <option key={activity.id} value={activity.id}>
          {activity.title}
        </option>
      ))}
    </select>
  );
}

function ActivityContentForm({
  activity,
  fileOptions,
  libraryOptions,
  quizOptions,
  onSave,
  onAttachFile,
  onAttachLibraryItem,
  onAttachQuiz,
}: {
  activity: Activity;
  fileOptions: Array<{ id: string; originalFilename: string }>;
  libraryOptions: Array<{ id: string; title: string }>;
  quizOptions: Array<{ id: string; title: string; status: string }>;
  onSave: (input: Record<string, unknown>) => Promise<unknown>;
  onAttachFile: (fileId: string) => Promise<unknown>;
  onAttachLibraryItem: (libraryItemId: string) => Promise<unknown>;
  onAttachQuiz: (quizId: string) => Promise<unknown>;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await onSave({
      textContent: String(data.get("textContent") ?? ""),
      externalUrl: String(data.get("externalUrl") ?? "") || undefined,
      content: {
        body: String(data.get("textContent") ?? ""),
        url: String(data.get("externalUrl") ?? "") || undefined,
      },
    });
  }
  const content = activity.activityContent?.content ?? {};
  const htmlDefault =
    typeof content.html === "string"
      ? content.html
      : typeof content.body === "string" && content.format === "rich_text_html"
        ? content.body
        : activity.activityContent?.textContent ?? "";
  const isTextActivity = activity.activityTypeKey === "core.text";
  const isQuizActivity = activity.activityTypeKey === "core.quiz";

  return (
    <div className="grid gap-4">
      <PluginActivityEditor activity={activity}>
        {isQuizActivity ? (
          <AttachSelect
            label="Attach quiz"
            options={quizOptions.map((quiz) => ({
              id: quiz.id,
              label: `${quiz.title} (${quiz.status})`,
            }))}
            onAttach={onAttachQuiz}
          />
        ) : isTextActivity ? (
          <RichTextEditor
            defaultValue={htmlDefault}
            onSubmit={(_value, payload) =>
              onSave({
                textContent: payload.text,
                content: {
                  format: "rich_text_html",
                  html: payload.html,
                  body: payload.html,
                },
              })
            }
          />
        ) : (
          <form className="grid gap-3" onSubmit={submit}>
            <label className="block text-sm font-medium text-foreground">
              Text content
              <textarea
                className="mt-2 min-h-32 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                defaultValue={activity.activityContent?.textContent ?? ""}
                name="textContent"
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              External URL
              <input
                className="mt-2 h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                defaultValue={activity.activityContent?.externalUrl ?? ""}
                name="externalUrl"
                type="url"
              />
            </label>
            <button
              className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              type="submit"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              Save content
            </button>
          </form>
        )}

        {!isQuizActivity ? (
          <>
            <AttachSelect
              label="Attach file"
              options={fileOptions.map((file) => ({
                id: file.id,
                label: file.originalFilename,
              }))}
              onAttach={onAttachFile}
            />
            <AttachSelect
              label="Attach library item"
              options={libraryOptions.map((item) => ({
                id: item.id,
                label: item.title,
              }))}
              onAttach={onAttachLibraryItem}
            />
          </>
        ) : null}
      </PluginActivityEditor>
    </div>
  );
}

function AttachSelect({
  label,
  options,
  onAttach,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  onAttach: (id: string) => Promise<unknown>;
}) {
  const [selectedId, setSelectedId] = useState("");

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-64 flex-1 text-sm font-medium text-foreground">
        {label}
        <select
          className="mt-2 h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
          onChange={(event) => setSelectedId(event.target.value)}
          value={selectedId}
        >
          <option value="">Select item</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        className="h-10 rounded-md border border-border px-3 text-sm font-semibold disabled:opacity-50"
        disabled={!selectedId}
        onClick={() => void onAttach(selectedId)}
        type="button"
      >
        Attach
      </button>
    </div>
  );
}
