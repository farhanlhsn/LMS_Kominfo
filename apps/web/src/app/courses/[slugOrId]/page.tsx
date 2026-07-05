"use client";

import { useParams } from "next/navigation";
import { ArrowRight, Award, BookOpen, Clock, Star, Users, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import {
  ActivityList,
  CourseStatusBadge,
  firstLesson,
  lessonCount,
} from "../../../components/lms/courses";
import { ButtonLink, PageHeader, StatCard } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import {
  ReviewComposer,
  ReviewList,
  ReviewSummary,
} from "../../../components/reviews/review-list";
import { WishlistButton } from "../../../components/reviews/wishlist-button";
import {
  useCourseCurriculum,
  useCourseDetail,
  useCourseReviews,
  useEnrollCourse,
  useMyEnrollments,
  useSession,
} from "../../../lib/api-hooks";
import {
  coursePricing,
  formatCurrency,
  shouldShowPaidCheckout,
} from "../../../lib/marketplace";
import type { CourseReview, Enrollment } from "../../../lib/lms-types";

function stringList(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : fallback;
}

export default function CourseDetailPage() {
  const params = useParams<{ slugOrId: string }>();
  const slugOrId = params.slugOrId;
  const detailQuery = useCourseDetail(slugOrId);
  const courseId = detailQuery.data?.id ?? null;
  const curriculumQuery = useCourseCurriculum(courseId);
  const enrollCourse = useEnrollCourse();
  const session = useSession();
  const enrollmentsQuery = useMyEnrollments();
  const reviewsQuery = useCourseReviews(courseId);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitial, setComposerInitial] = useState<{ rating?: number; title?: string; body?: string } | undefined>();
  const [composerSubmitting, setComposerSubmitting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  const course = curriculumQuery.data ?? detailQuery.data;
  const firstPublishedLesson = firstLesson(course);
  const instructor =
    course?.instructors?.[0]?.user?.name ??
    course?.instructors?.[0]?.user?.email ??
    "Instructor";
  const pricing = coursePricing(course);
  const isPaidCheckout = shouldShowPaidCheckout(pricing);

  const reviewsPayload = reviewsQuery.data as
    | {
        data: CourseReview[];
        average: number;
        totalReviews: number;
        meta?: { page?: number; totalPages?: number };
      }
    | undefined;
  const reviews = reviewsPayload?.data ?? [];
  const myEnrollment: Enrollment | undefined = useMemo(
    () =>
      (enrollmentsQuery.data ?? []).find(
        (item) => item.courseId === courseId,
      ),
    [enrollmentsQuery.data, courseId],
  );
  const canReview = Boolean(
    session?.user?.id &&
      myEnrollment?.id &&
      myEnrollment.status === "COMPLETED",
  );
  const myReview: CourseReview | undefined = reviews.find(
    (review) => review.userId === session?.user?.id,
  );

  async function submitReview(input: { rating: number; title: string; body: string }) {
    if (!courseId) return;
    setComposerSubmitting(true);
    setComposerError(null);
    try {
      const { api } = await import("../../../lib/api-client");
      if (myReview) {
        await api.updateCourseReview(myReview.id, input);
      } else {
        await api.createCourseReview({ courseId, ...input });
      }
      setComposerOpen(false);
      setComposerInitial(undefined);
      await reviewsQuery.refresh();
    } catch (caught) {
      setComposerError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setComposerSubmitting(false);
    }
  }

  async function deleteMyReview() {
    if (!myReview) return;
    try {
      const { api } = await import("../../../lib/api-client");
      await api.deleteCourseReview(myReview.id);
      setComposerOpen(false);
      setComposerInitial(undefined);
      await reviewsQuery.refresh();
    } catch (caught) {
      setComposerError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!courseId || !session?.user?.id) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { api } = await import("../../../lib/api-client");
          await api.trackCourseView(courseId);
        } catch {
          // best effort
        }
      })();
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [courseId, session?.user?.id]);

  async function enroll() {
    if (!course) return;
    if (isPaidCheckout) {
      // Paid flow: hand off to the order creation screen.
      window.location.href = `/orders/new?courseId=${encodeURIComponent(course.id)}`;
      return;
    }
    setEnrolling(true);
    setEnrollError(null);
    try {
      await enrollCourse(course.id);
      window.location.href = `/learn/courses/${course.id}`;
    } catch (error) {
      setEnrollError(error instanceof Error ? error.message : String(error));
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <AuthGate>
      <AppShell currentPath="/courses">
        {detailQuery.loading ? (
          <LoadingState title="Loading course" />
        ) : detailQuery.error || !course ? (
          <ApiErrorState
            error={detailQuery.error}
            fallbackTitle="Could not load course"
            fallbackDescription="Course was not found."
          />
        ) : (
          <>
            <PageHeader
              breadcrumbs={[
                { label: "Courses", href: "/courses" },
                { label: course.title },
              ]}
              eyebrow={course.category?.name ?? "Course"}
              title={course.title}
              description={course.description ?? course.subtitle ?? undefined}
              actions={<CourseStatusBadge status={course.status} />}
            />

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                <div className="flex min-h-56 items-center justify-center rounded-lg border border-border bg-muted">
                  <BookOpen aria-hidden="true" className="h-16 w-16 text-primary" />
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    icon={BookOpen}
                    label="Lessons"
                    value={`${lessonCount(course)}`}
                  />
                  <StatCard
                    icon={Clock}
                    label="Duration"
                    value={`${course.durationMinutes ?? 0}m`}
                  />
                  <StatCard
                    icon={Users}
                    label="Learners"
                    value={`${course._count?.enrollments ?? 0}`}
                  />
                  <StatCard icon={Award} label="Certificate" value="Future" />
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    disabled={enrolling || course.status !== "PUBLISHED"}
                    onClick={enroll}
                    type="button"
                  >
                    {enrolling
                      ? "Enrolling"
                      : isPaidCheckout
                        ? "Buy and start"
                        : "Enroll and start"}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                  {firstPublishedLesson ? (
                    <ButtonLink
                      href={`/learn/lessons/${firstPublishedLesson.id}`}
                      variant="secondary"
                    >
                      Open first lesson
                    </ButtonLink>
                  ) : null}
                  <WishlistButton courseId={course.id} />
                </div>
                {enrollError ? (
                  <p className="mt-3 text-sm text-destructive">{enrollError}</p>
                ) : null}
              </article>

              <aside className="space-y-4">
                <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                  <p className="text-sm font-medium text-muted-foreground">
                    Instructor
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{instructor}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Instructor data is scoped by the active organization.
                  </p>
                </article>
                <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                  <div className="flex items-center gap-2">
                    <Tag aria-hidden="true" className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Pricing</p>
                  </div>
                  {isPaidCheckout ? (
                    <>
                      <p className="mt-2 text-2xl font-semibold">
                        {formatCurrency(pricing.price, pricing.currency)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        One-time purchase. Includes full course access.
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Free for active organization members.
                    </p>
                  )}
                </article>
                <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                  <div className="flex items-center gap-2">
                    <Star aria-hidden="true" className="h-4 w-4 text-warning" />
                    <p className="text-sm font-semibold">Rating and reviews</p>
                  </div>
                  <div className="mt-2">
                    <ReviewSummary
                      average={reviewsPayload?.average ?? 0}
                      total={reviewsPayload?.totalReviews ?? 0}
                    />
                  </div>
                </article>
              </aside>
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-3">
              {[
                [
                  "Objectives",
                  stringList(course.learningObjectives, [
                    "Understand the course concepts and complete activities.",
                  ]),
                ],
                [
                  "Requirements",
                  stringList(course.requirements, [
                    "An active account and time to practice.",
                  ]),
                ],
                [
                  "Target audience",
                  stringList(course.targetAudience, [
                    "Learners in the active organization.",
                  ]),
                ],
              ].map(([title, items]) => (
                <article
                  key={String(title)}
                  className="rounded-lg border border-border bg-card p-5 shadow-subtle"
                >
                  <h2 className="text-base font-semibold">{String(title)}</h2>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                    {(items as string[]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>

            <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
              <p className="text-sm font-medium text-muted-foreground">
                Curriculum
              </p>
              <h2 className="mt-1 text-lg font-semibold">Preview</h2>
              <div className="mt-5 space-y-4">
                {curriculumQuery.loading ? (
                  <LoadingState title="Loading curriculum" />
                ) : course.modules?.length ? (
                  course.modules.flatMap((module) =>
                    module.lessons.map((lesson, index) => (
                      <article
                        key={lesson.id}
                        className="rounded-lg border border-border p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {module.title} / Lesson {index + 1}
                        </p>
                        <h3 className="mt-2 text-base font-semibold">
                          {lesson.title}
                        </h3>
                        <ActivityList lesson={lesson} />
                      </article>
                    )),
                  )
                ) : (
                  <EmptyState
                    title="No curriculum published"
                    description="Published lessons will appear here when available."
                  />
                )}
              </div>
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Learner reviews</h2>
                  {canReview || myReview ? (
                    <button
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                      onClick={() => {
                        setComposerError(null);
                        setComposerInitial(
                          myReview
                            ? {
                                rating: myReview.rating,
                                title: myReview.title ?? "",
                                body: myReview.body ?? "",
                              }
                            : undefined,
                        );
                        setComposerOpen((value) => !value);
                      }}
                      type="button"
                    >
                      {myReview
                        ? composerOpen
                          ? "Close editor"
                          : "Edit your review"
                        : "Write a review"}
                    </button>
                  ) : null}
                </div>
                {composerOpen ? (
                  <div className="mt-3">
                    <ReviewComposer
                      {...(composerInitial ?? {})}
                      error={composerError}
                      onCancel={() => {
                        setComposerOpen(false);
                        setComposerInitial(undefined);
                      }}
                      onSubmit={submitReview}
                      submitting={composerSubmitting}
                      submitLabel={myReview ? "Save review" : "Submit review"}
                    />
                  </div>
                ) : null}
                <div className="mt-4">
                  {reviewsQuery.loading ? (
                    <LoadingState title="Loading reviews" />
                  ) : (
                    <ReviewList
                      currentUserId={session?.user?.id ?? null}
                      emptyDescription="Be the first to review this course after you finish it."
                      emptyTitle="No reviews yet"
                      onDelete={(review) => {
                        if (review.id === myReview?.id) void deleteMyReview();
                      }}
                      onEdit={(review) => {
                        setComposerError(null);
                        setComposerInitial({
                          rating: review.rating,
                          title: review.title ?? "",
                          body: review.body ?? "",
                        });
                        setComposerOpen(true);
                      }}
                      reviews={reviews}
                    />
                  )}
                </div>
              </article>

              <aside className="space-y-4">
                <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                  <h2 className="text-sm font-semibold">About the instructor</h2>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {instructor}
                  </p>
                  {session?.user?.id &&
                  course.instructors?.[0]?.user &&
                  (course.instructors[0].user as { id?: string }).id ? (
                    <FavoriteInstructorButton
                      instructorId={
                        (course.instructors[0].user as { id: string }).id
                      }
                    />
                  ) : null}
                </article>
              </aside>
            </section>
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}

function FavoriteInstructorButton({ instructorId }: { instructorId: string }) {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-3 inline-flex flex-col items-start gap-1">
      <button
        className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
          active
            ? "border-primary/40 bg-primary/5 text-primary"
            : "border-border bg-card text-foreground hover:bg-muted"
        }`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const { api } = await import("../../../lib/api-client");
            if (active) {
              await api.removeFavoriteInstructor(instructorId);
              setActive(false);
            } else {
              await api.addFavoriteInstructor({ instructorId });
              setActive(true);
            }
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
          } finally {
            setBusy(false);
          }
        }}
        type="button"
      >
        {active ? "Following" : "Follow instructor"}
      </button>
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
