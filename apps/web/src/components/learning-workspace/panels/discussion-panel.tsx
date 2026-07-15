"use client";

import { MessageSquare } from "lucide-react";
import { WorkspaceDiscussionPanel } from "../../engagement/engagement";
import type { Activity, Course, Lesson } from "../../../lib/lms-types";
import { PanelFrame } from "./panel-shared";

export function DiscussionPanel({
  course,
  lesson,
  activity,
}: {
  course: Course;
  lesson: Lesson;
  activity: Activity;
}) {
  return (
    <PanelFrame
      icon={
        <MessageSquare aria-hidden="true" className="h-5 w-5 text-primary" />
      }
      title="Discussion"
    >
      <WorkspaceDiscussionPanel courseId={course.id} lessonId={lesson.id} activityId={activity.id} />
    </PanelFrame>
  );
}
