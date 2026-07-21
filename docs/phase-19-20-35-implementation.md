# Phase 19, 20, 35 Implementation Notes

This document captures the implementation decisions for the Global Search
(Phase 19), Help Center + Support Tickets + Locale Preferences (Phase 20)
and Transcript Notes with AI Context (Phase 35) modules.

## Shared infrastructure

- New Prisma migration: `packages/db/prisma/migrations/20260706070000_phase_19_20_35/migration.sql`
- New schema slice appended to `packages/db/prisma/schema.prisma`:
  - `SearchQuery` and supporting analytics models (Phase 19)
  - `HelpCategory`, `HelpArticle`, `HelpArticleView`, `SupportTicket`,
    `SupportTicketReply`, `UserLocalePreference`, `OrgLocalePreference` (Phase 20)
  - `TranscriptNote`, `NoteContext`, `NotesExport` (Phase 35)
- Relations added to `User`, `Organization` and existing `Transcript` models
  to keep cascade behaviour consistent with the rest of the LMS.
- New modules registered in `apps/api/src/app.module.ts`:
  - `SearchModule` (global, also exported for cross-module use)
  - `HelpModule`
  - `SupportModule`
  - `LocaleModule`
  - `NotesModule`

## Phase 19 - Global Search

### Provider abstraction

Search is fully behind a `SEARCH_PROVIDER` injection token. The default
implementation is `MockSearchProvider`, which holds an in-memory index of
documents keyed by `organizationId`. Real backends (Meilisearch, OpenSearch,
pgvector hybrid) can be plugged in without touching call sites.

```ts
export const SEARCH_PROVIDER = Symbol('SEARCH_PROVIDER');
export interface SearchProvider {
  indexDocuments(orgId: string, documents: SearchDocument[]): Promise<void>;
  removeDocuments(orgId: string, ids: string[]): Promise<void>;
  query(orgId: string, request: SearchRequest): Promise<SearchResult>;
  semanticQuery?(orgId: string, request: SearchRequest): Promise<SearchResult>;
}
```

### Multi-entity indexing

The following entities are indexed automatically when created or updated:

- `Course`
- `Lesson`
- `LearningMaterial` (file/video)
- `DiscussionThread` and `DiscussionPost`
- `User` (display name, public bio, role within org)
- `Certificate`

Indexers live in `search.indexers.ts` and are wired into the existing
service hooks (no controller-level side effects).

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/search` | Unified search across all indexed entities for the caller's org |
| GET    | `/search/suggest` | Lightweight typeahead (top 5 hits) |
| POST   | `/search/reindex` | Admin-only: reindex an entity type |
| GET    | `/search/analytics` | Admin-only: top queries, zero-result queries, latency p50/p95 |

### Frontend

- `apps/web/src/components/search/global-search.tsx` is the header-mounted
  search input with keyboard shortcut (`Ctrl/Cmd+K`).
- `apps/web/src/app/search/page.tsx` is the result page with tabs per
  entity, filters, and pagination.
- `useGlobalSearch`, `useSearchSuggestions`, `useSearchAnalytics` hooks in
  `apps/web/src/components/hooks/use-search.ts` wrap the API.

## Phase 20 - Help Center, Support Tickets, Locale Preferences

### Help Center

- `HelpCategory` is hierarchical (parent/child self-relation) and localized.
- `HelpArticle` is markdown-based, supports `status` (`DRAFT`, `PUBLISHED`,
  `ARCHIVED`) and per-org visibility.
- `HelpArticleView` records a row per (article, user, day) for analytics
  without polluting article metadata.
- Public endpoints (`/help/categories`, `/help/articles/:slug`) do not
  require authentication but filter strictly by `organizationId` resolved
  from the host or the caller's active org.
- Instructor endpoints under `/instructor/help/...` allow categories and
  articles management with audit logging.

### Support Tickets

- `SupportTicket` carries `subject`, `description`, `priority` (`LOW`,
  `MEDIUM`, `HIGH`, `URGENT`), `status` (`OPEN`, `WAITING`, `RESOLVED`,
  `CLOSED`), `category`, and `assigneeId` (optional).
- `SupportTicketReply` is the threaded conversation; `isStaffReply` flag
  marks instructor/admin responses.
- Endpoints under `/support/tickets` (learner) and `/instructor/support/tickets`
  (staff). Status transitions emit realtime events on
  `org:{orgId}:support:{ticketId}`.

### Locale Preferences

- `UserLocalePreference` (one per user) stores `locale`, `timezone`,
  `dateFormat`, `numberFormat`, `firstDayOfWeek`.
- `OrgLocalePreference` provides defaults that the user preference can
  override.
- `LocaleService.resolve(userId, orgId)` returns the merged preference
  used by every frontend formatter.

### Frontend

- `apps/web/src/app/help/page.tsx` and `/help/[slug]/page.tsx` are the
  public help center.
- `apps/web/src/app/support/tickets/page.tsx` is the learner ticket list
  and detail. `apps/web/src/app/instructor/support/page.tsx` is the staff
  queue.
- `LocaleProvider` is added to the root layout and reads
  `OrgLocalePreference` then `UserLocalePreference` on hydration.
- `useLocale`, `useHelpCategories`, `useHelpArticle`, `useSupportTickets`
  hooks wrap the API.

## Phase 35 - Transcript Notes with AI Context

### Domain model

- `TranscriptNote` belongs to a user, an organization and a transcript
  segment. It stores `startMs`, `endMs`, `body` (markdown), `color`,
  `pinned`, and a `visibility` enum (`PRIVATE`, `INSTRUCTOR`, `ORG`).
- `NoteContext` is a polymorphic multi-relation link table: a note can be
  anchored to many domain entities (`Course`, `Lesson`, `Activity`,
  `Assignment`, `Discussion`). The `(noteId, entityType, entityId)`
  composite unique constraint prevents duplicates.
- `NotesExport` records an export job: `format` (`JSON`, `MARKDOWN`,
  `PDF`), `status` (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`), and the
  resolved list of note ids.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/notes` | List notes for the caller with filters (course, lesson, transcript, pinned) |
| POST   | `/notes` | Create a note (with optional `contexts`) |
| PATCH  | `/notes/:id` | Update body/color/pinned/visibility |
| DELETE | `/notes/:id` | Soft delete (sets `deletedAt`) |
| POST   | `/notes/:id/contexts` | Attach additional context entities |
| DELETE | `/notes/:id/contexts/:ctxId` | Detach a context |
| POST   | `/notes/export` | Queue an export (sync if `<= 25` notes, async otherwise) |
| GET    | `/notes/exports/:id` | Get export status / download URL |

### AI context plumbing

When the AI tutor answers a question, it calls
`NotesService.collectContext(userId, queryEntity)` which gathers notes
linked to the relevant `Course`/`Lesson`/`Activity` and surfaces them as
RAG context. The note body is trimmed to the top 3 most recent notes per
context to respect the token budget.

### Frontend

- `apps/web/src/components/notes/note-editor.tsx` is the inline transcript
  editor; the timestamp is preserved when the user clicks the transcript
  cue.
- `apps/web/src/components/notes/notes-panel.tsx` is the lesson sidebar
  panel with filtering and the export button.
- `apps/web/src/app/learn/notes/page.tsx` is the cross-course notes view.
- `useTranscriptNotes`, `useNote`, `useCreateNote`, `useExportNotes` hooks
  wrap the API.

## Verification

See `phase-19-20-35-completion-report.md` for the latest test/run summary.
