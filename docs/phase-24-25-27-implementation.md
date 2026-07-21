# Phase 24, 25, 27 Implementation Notes

This document captures the implementation decisions for the Realtime Gateway
(Phase 24), Bulk Operations (Phase 25) and Direct Messaging (Phase 27) modules.

## Shared infrastructure

- New Prisma migration: `packages/db/prisma/migrations/20260706080000_phase_24_25_27/migration.sql`
- New schema slice appended to `packages/db/prisma/schema.prisma`:
  - `RealtimeEvent`, `RealtimeSubscription` (Phase 24)
  - `BulkJob`, `BulkJobItem` + `BulkJobType`, `BulkJobStatus`, `BulkJobItemStatus` enums (Phase 25)
  - `Conversation`, `ConversationMember`, `Message`, `MessageReaction`,
    `MessageRead`, `UserBlock` + `ConversationType`, `ConversationMemberRole`
    enums (Phase 27)
- Relations added to `User` and `Organization` models to keep cascade behaviour
  consistent with the rest of the LMS.
- New modules registered in `apps/api/src/app.module.ts`:
  - `RealtimeModule` (global, also exported for cross-module use)
  - `BulkOperationModule`
  - `MessagingModule`

## Phase 24 - Realtime Gateway

### Channel naming

`org:{organizationId}:{entity}:{entityId}` is the canonical convention used
across all modules. The `RealtimeService.assertChannelScope` method ensures a
publish/poll request can only target channels inside the caller's active
organization.

### Transport

`RealtimeGateway` is an in-process abstraction that can be backed by polling,
SSE, or WebSocket in the future. The current default is the polling endpoint
`GET /api/v1/realtime/poll?since=<timestamp>` which returns events newer than
the timestamp. The 5-second polling interval matches the frontend hook.

The transport layer is exposed as the `REALTIME_TRANSPORT` injection token:

```ts
export const REALTIME_TRANSPORT = Symbol('REALTIME_TRANSPORT');
export interface RealtimeTransport {
  publish(channel: string, event: RealtimeEvent): Promise<void>;
  poll(orgId: string, since: Date): Promise<RealtimeEvent[]>;
}
```

The default `PollingRealtimeTransport` stores events in the
`RealtimeEvent` table and returns rows with `createdAt > since`. A future
`SseRealtimeTransport` and `WebSocketRealtimeTransport` can be swapped in
without touching call sites.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/realtime/transports` | Returns the preferred + available transports |
| GET    | `/realtime/channels/org/:entity/:entityId` | Build a channel name safely |
| GET    | `/realtime/poll` | Poll for new events for the caller's organization |
| POST   | `/realtime/publish` | Admin-only publishing for testing |
| POST   | `/realtime/subscribe` | Record a subscription for a user |
| DELETE | `/realtime/subscribe` | Remove a subscription |
| POST   | `/realtime/ack` | Acknowledge an event (updates `lastSeenAt`) |

### Frontend

- `useRealtimeChannel(channel, options)` hook lives in
  `apps/web/src/components/hooks/use-realtime-channel.ts`. It uses 5-second
  polling and exposes `status`, `lastEventAt`, and `error` for the UI.
- `RealtimeStatusPill` shows the current connection state with a pulsing dot.
- All endpoints are wrapped in `apiClient` and `useRealtimeTransports` is
  exported for future reconnection logic.

## Phase 25 - Bulk Operations

### Job lifecycle

- A `BulkJob` is created with `PENDING` status and items are persisted eagerly.
- Small jobs (`<= 25` items) execute synchronously in the same request.
- Larger jobs are dispatched via `setTimeout` and update progress as items
  complete; status transitions to `COMPLETED`, `PARTIAL`, or `FAILED` based on
  the failure ratio.
- `cancel` and `resume` endpoints allow operators to manage stuck or failed
  jobs. Resume reruns the same item list, marking the new attempts as
  `PROCESSED`.
- The realtime gateway is notified for `bulk.created`, `bulk.completed`,
  `bulk.failed`, `bulk.cancelled` events using the `org:{orgId}:bulk:{jobId}`
  channel so live UIs can refresh automatically.

### Endpoints (all admin only via `platform:admin` permission)

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/admin/bulk/jobs` | List recent jobs (filter by type/status) |
| POST   | `/admin/bulk/jobs` | Create + run a new job |
| GET    | `/admin/bulk/jobs/:id` | Inspect a job and its items |
| POST   | `/admin/bulk/jobs/:id/cancel` | Cancel a running/pending job |
| POST   | `/admin/bulk/jobs/:id/resume` | Resume a cancelled/failed job |

### Frontend

- `apps/web/src/app/admin/bulk/page.tsx` provides the queue, status filter, and
  creation form.
- `BulkJobForm` lets admins choose a job type, entity type, and entity IDs
  (comma/space separated).
- `BulkJobTable` lists jobs with status badges, progress, and per-row
  cancel/resume actions.

## Phase 27 - Direct Messaging

### Domain model

- `Conversation` can be `DIRECT` (1:1) or `GROUP`.
- `ConversationMember` tracks `role` (`MEMBER` / `ADMIN`) and per-user
  `lastReadAt` for unread counters.
- `Message` supports attachments, parent/threaded replies, soft delete, and
  edit tracking.
- `MessageReaction` is a per-user per-emoji record; the unique key prevents
  duplicate reactions.
- `MessageRead` records per-user per-message reads.
- `UserBlock` keeps tenant-scoped blocks so conversation creation refuses to
  include blocked users.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/messages/conversations` | List conversations the user is in |
| POST   | `/messages/conversations` | Create a DIRECT or GROUP conversation |
| GET    | `/messages/conversations/:id` | Conversation detail |
| POST   | `/messages/conversations/:id/members` | Admin-only add members |
| GET    | `/messages/conversations/:id/messages` | List messages (paginated by `cursor`) |
| POST   | `/messages/conversations/:id/messages` | Send a message |
| PATCH  | `/messages/messages/:id` | Edit own message |
| DELETE | `/messages/messages/:id` | Soft delete own message |
| POST   | `/messages/messages/:id/reactions` | Toggle a reaction |
| POST   | `/messages/conversations/:id/read` | Mark conversation (or single message) read |
| POST   | `/messages/blocks` | Block a user (requires `users:update`) |
| DELETE | `/messages/blocks/:userId` | Unblock a user |

### Frontend

- `apps/web/src/app/messages/page.tsx` is the conversation workspace.
- `ConversationList` lists conversations and provides an inline new
  conversation form.
- `MessageThread` renders the live thread, subscribes to the realtime channel
  for `org:{orgId}:conversation:{conversationId}` so new messages refresh
  without polling the page.
- `MessageComposer` is a standalone composer for replies / new threads.

## Verification

See `phase-24-25-27-completion-report.md` for the latest test/run summary.
