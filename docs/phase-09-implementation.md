# Phase 09 Implementation

Phase 09 adds tenant-scoped discussions, live class scheduling, in-app notifications, and a computed learning calendar.

## Architecture

- Discussions persist course, lesson, and activity context. Threads and replies use soft deletion and moderation status.
- Discussions are available from course tabs, a cross-course learner page, the learning workspace, instructor management, and organization moderation. Learners can report content and moderators can resolve, dismiss, or hide it.
- Live classes persist provider-neutral scheduling data. Provider values are adapter keys operating in manual-link mode; no Zoom or Google Meet API calls are made.
- Notifications are per-user and per-organization, respect basic preferences, and suppress identical entity notifications created within one minute.
- The notification bell opens a floating recent-notification center. The full page supports all/unread views and per-type preferences.
- Calendar uses a hybrid model: source records remain canonical for live classes, assignments, and quizzes, while instructor-created course events are persisted in `CalendarEvent`.
- Learning calendars provide agenda and month modes globally, per course, and for instructors. The workspace provides a compact Upcoming panel.

## Security

- Every query includes the active organization.
- Learner access requires an active/completed enrollment; assigned instructors and organization/course administrators receive management access.
- Meeting URLs are available only through authenticated course-access checks and the join endpoint.
- Moderation and live-class mutations create audit logs.
- Discussion content is rendered as plain text; unsafe HTML is never injected.

## Integrations

- Discussion replies notify thread participants other than the actor.
- Live class scheduling and cancellation notify active/completed learners.
- Assignment grading and certificate issuance create learner notifications.
- Notification refresh creates deduplicated live-class reminders within 30 minutes and assignment/quiz reminders within 24 hours.

## Intentional boundaries

- Zoom and Google Meet are provider choices with validated manually pasted links only. Adapter contracts and capability discovery are ready for future API integration.
- No distributed event bus, drag-and-drop calendar, attendance tracking, or external email delivery is introduced in Phase 09.
