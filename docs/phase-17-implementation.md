# Phase 17 Implementation - Advanced Video Learning

## Scope

Phase 17 extends the advanced learning workspace and video pipeline with:

- multi-language caption track management for `core.video`
- transcript filtering by language and caption-driven transcript sync
- caption-aware video playback in the learner workspace
- instructor AI draft generation for transcript summary and transcript-based quiz drafts
- formal Prisma schema and migration updates for advanced video data

## Backend Changes

### Database

Updated `packages/db/prisma/schema.prisma` with:

- `VideoCaptionTrack` model
- `AiGeneratedItem` model
- enums for caption kind/source and AI generated item type/status
- relation wiring for `Organization`, `Course`, `Lesson`, `Activity`, and `User`

Added formal migration:

- `packages/db/prisma/migrations/20260706040000_phase_17_advanced_video/migration.sql`

### Learning Workspace API

Updated `apps/api/src/learning-workspace/` to add:

- transcript query filtering by `language` and `search`
- learner caption listing: `GET /api/v1/learn/activities/:activityId/captions`
- instructor caption management:
  - `GET /api/v1/instructor/activities/:activityId/captions`
  - `POST /api/v1/instructor/activities/:activityId/captions`
  - `PATCH /api/v1/instructor/caption-tracks/:trackId`
  - `DELETE /api/v1/instructor/caption-tracks/:trackId`
- workspace context enrichment with:
  - `captionLanguages`
  - `defaultCaptionLanguage`

Added parsing utilities in:

- `apps/api/src/learning-workspace/video-caption.util.ts`

Supported caption inputs:

- WebVTT
- SRT
- raw pasted caption content from instructor UI

When `syncTranscript` is enabled, caption cues replace transcript segments for the same activity/language and re-trigger AI indexing.

### AI Draft Generation

Added instructor activity-level AI endpoints:

- `GET /api/v1/instructor/activities/:activityId/ai/generated-items`
- `POST /api/v1/instructor/activities/:activityId/ai/video-summary`
- `POST /api/v1/instructor/activities/:activityId/ai/video-quiz`

Implementation notes:

- outputs are stored as `AiGeneratedItem`
- generated items always start as `DRAFT`
- summary output is stored as markdown-like content payload
- quiz output is stored as reviewable JSON draft payload
- AI-disabled environments use deterministic fallback generation so local development remains usable
- sensitive generation actions create audit log entries

## Frontend Changes

### Learner Experience

Updated:

- `apps/web/src/components/content/content.tsx`
- `apps/web/src/components/plugins/plugin-activity.tsx`
- `apps/web/src/components/learning-workspace/workspace.tsx`

Behavior added:

- video player now mounts real caption tracks from workspace data
- transcript panel supports language switching when multiple caption languages exist
- transcript loading can follow the selected caption language
- workspace keeps existing timestamp notes and bookmarks behavior while now pairing it with richer caption/transcript support

### Instructor Builder

Updated:

- `apps/web/src/app/instructor/courses/[courseId]/builder/page.tsx`

Added builder-side tools for video activities:

- paste or load `.vtt` / `.srt` caption content
- set default caption language
- optionally sync transcript from caption cues
- view existing caption tracks
- mark a track as default
- delete caption tracks
- generate AI summary draft
- generate AI quiz draft
- review generated draft items directly from the builder panel

## Test Coverage Added

Added or updated tests for:

- caption parsing utility
- workspace caption controller flows
- caption track service sync behavior
- AI generated item service
- AI controller coverage for new instructor activity endpoints

## Additional Maintenance

While validating phase 17, `packages/db/prisma/seed.ts` contained type issues in the seeded analytics/gamification block. Those references were corrected so monorepo typecheck remains green.
