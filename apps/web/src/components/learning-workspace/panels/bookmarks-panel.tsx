"use client";

import { Bookmark } from "lucide-react";
import {
  useCreateLearnerBookmark,
  useDeleteLearnerBookmark,
  useLearnerBookmarks,
} from "../../../lib/api-hooks";
import type { Activity, Course, LearnerBookmark, Lesson } from "../../../lib/lms-types";
import {
  PanelFrame,
  PanelList,
  TimestampBookmarkButton,
  formatTimestamp,
  seekVideo,
} from "./panel-shared";

export function BookmarksPanel({
  course,
  lesson,
  activity,
  videoTime,
}: {
  course: Course;
  lesson: Lesson;
  activity: Activity;
  videoTime: number;
}) {
  const bookmarks = useLearnerBookmarks({
    courseId: course.id,
    lessonId: lesson.id,
    activityId: activity.id,
  });
  const createBookmark = useCreateLearnerBookmark();
  const deleteBookmark = useDeleteLearnerBookmark();

  async function addBookmark() {
    await createBookmark({
      courseId: course.id,
      lessonId: lesson.id,
      activityId: activity.id,
      videoTimeSeconds: Math.round(videoTime),
      title: activity.title,
      note: videoTime ? `Saved at ${formatTimestamp(videoTime)}` : undefined,
    });
    await bookmarks.reload();
  }

  return (
    <PanelFrame
      icon={<Bookmark aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="Bookmarks"
    >
      <TimestampBookmarkButton onClick={addBookmark} videoTime={videoTime} />
      <PanelList
        empty="No bookmarks yet"
        error={bookmarks.error}
        loading={bookmarks.loading}
        items={bookmarks.data}
        render={(bookmark: LearnerBookmark) => (
          <article
            key={bookmark.id}
            className="rounded-md border border-border bg-background p-3"
          >
            <p className="text-sm font-semibold">
              {bookmark.title ?? "Bookmark"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatTimestamp(bookmark.videoTimeSeconds)}
            </p>
            {bookmark.note ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {bookmark.note}
              </p>
            ) : null}
            <button
              className="mt-2 text-xs font-semibold text-destructive"
              onClick={() =>
                void deleteBookmark(bookmark.id).then(() => bookmarks.reload())
              }
              type="button"
            >
              Delete
            </button>
          </article>
        )}
      />
    </PanelFrame>
  );
}
