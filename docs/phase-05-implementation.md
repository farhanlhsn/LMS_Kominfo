# Phase 05 Implementation Notes

Phase 05 adds the advanced learning workspace foundation with resizable panels, curriculum sidebar, notes, bookmarks, transcript segments, layout preferences, and workspace state persistence.

## Database

Added workspace and learning experience tables:

- `LearningWorkspacePreference` - per-user panel layout, sidebar width, active panel
- `LessonWorkspaceState` - per-lesson scroll position, active tab, panel states
- `LearnerNote` - per-activity learner notes with timestamps
- `LearnerBookmark` - bookmarked activities and lessons
- `TranscriptSegment` - activity transcript segments with timestamps and text

## Backend

Added `LearningWorkspaceModule` with endpoints under `learn/` and `instructor/`:

Learner endpoints:

- `GET /api/v1/learn/workspace/preferences`
- `PATCH /api/v1/learn/workspace/preferences`
- `GET /api/v1/learn/workspace/state`
- `PATCH /api/v1/learn/workspace/state`
- `GET /api/v1/learn/notes`
- `POST /api/v1/learn/notes`
- `PATCH /api/v1/learn/notes/:noteId`
- `DELETE /api/v1/learn/notes/:noteId`
- `GET /api/v1/learn/bookmarks`
- `POST /api/v1/learn/bookmarks`
- `PATCH /api/v1/learn/bookmarks/:bookmarkId`
- `DELETE /api/v1/learn/bookmarks/:bookmarkId`
- `GET /api/v1/learn/activities/:activityId/transcript`
- `GET /api/v1/learn/activities/:activityId/workspace-context`

Instructor transcript endpoints:

- `GET /instructor/activities/:activityId/transcript`
- `POST /instructor/activities/:activityId/transcript`
- `PATCH /instructor/transcript-segments/:segmentId`
- `DELETE /instructor/transcript-segments/:segmentId`

All learner endpoints require active enrollment. Instructor transcript endpoints require course management permissions.

## Frontend

Added learning workspace UI:

- Resizable panel layout for lesson view
- Curriculum sidebar with progress indicators
- Notes panel with create/edit/delete
- Bookmark toggle on activities and lessons
- Transcript panel on video activities
- Workspace state persistence (scroll, active panel, tabs)
- Popout lesson view for dual-monitor support at `/learn/popout`

## Security

- All workspace data is scoped to the active user and organization.
- Learner access requires enrollment; instructor access requires course management.
- No cross-tenant data exposure.

## Verification

- `pnpm db:generate`
- `pnpm db:deploy`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Test coverage for the learning workspace module: 12 unit tests across
`learning-workspace.controller.spec.ts` (8) and
`learning-workspace.service.spec.ts` (4).

## Remaining Notes

- AI panel placeholder is ready for [Phase 08 AI RAG integration](phase-08-implementation.md).
- Dual-monitor popout uses localStorage for cross-window communication.
