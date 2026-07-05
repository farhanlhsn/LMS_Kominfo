# Phase 18 Completion Report

## Phase

- Phase 18: Advanced Assignment (with Phase 17 hardening follow-through).

## Task Status

- Completed: Phase 18 Prisma schema for group assignment, peer review, annotations, plagiarism, project showcase, portfolio, and resubmission cap.
- Completed: Phase 18 formal migration `20260706050000_phase_18_advanced_assignment/migration.sql` (no UTF-8 BOM, no `db push`).
- Completed: `AdvancedAssignmentModule` with DTOs, service, nine controller classes, `MockPlagiarismProvider` behind the `PLAGIARISM_PROVIDER` injection token.
- Completed: Round-robin peer review match generation with `reviewsRequired` / `reviewsToReceive` enforcement.
- Completed: Portfolio auto-creation on first read, share-token issuance, public access under `/p/[shareToken]`.
- Completed: Resubmission cap enforcement inside `assignments.service.createSubmission`.
- Completed: 10 unit tests for `AdvancedAssignmentService` (groups, peer review config + matches, plagiarism, annotations, showcase, portfolio, ownership, not-found).
- Completed: Phase 17 hardening — caption cue editor endpoints (`list/create/update/delete/reorder`) and matching unit tests.
- Completed: Phase 17 hardening — AI generated item approval workflow (`list`, `get`, `update`, `approve`, `reject`, `publish`) with audit logs.
- Completed: Frontend types, API client methods, React hooks for every new endpoint.
- Completed: Six advanced-assignment components (`group-manager`, `peer-review-manager`, `plagiarism-panel`, `showcase-manager`, `ai-approval-queue`, `caption-cue-editor`).
- Completed: shadcn-style UI primitives (`Button`, `Card`, `Input`, `Textarea`, `Select`) and the `useApiMutation` hook.
- Completed: Learner pages (`/learn/portfolio`, `/learn/peer-reviews`, `/p/[shareToken]`) and instructor advanced assignment page (`/instructor/assignments/[assignmentId]`).
- Completed: Integration of the cue editor and AI approval queue into the instructor course builder for `core.video` activities.
- Completed: `Advanced` action link in the assignment list to reach the advanced assignment page.
- Completed: Implementation notes and this completion report.

## Verification Results

- `pnpm --filter @lms/db exec prisma generate`: passed.
- `pnpm -r exec tsc --noEmit`: passed for every workspace.
- `pnpm -r test`: passed
  - `apps/api`: 407/407
  - `apps/web`: 165/165
  - `packages/config`: 12/12
  - `packages/shared`: 3/3
  - **Total: 587/587 unit tests passing.**
- Focused verification:
  - `pnpm --filter @lms/api test -- src/advanced-assignment/advanced-assignment.service.spec.ts src/learning-workspace/learning-workspace.service.spec.ts src/learning-workspace/learning-workspace.controller.spec.ts src/ai/ai-generated-item.service.spec.ts src/ai/ai.controller.spec.ts` — all green.
  - `pnpm --filter @lms/web test` — all green (includes workspace spec).

## Migration Status

- Phase 18 migration SQL is in place and Prisma client generation succeeds against the updated schema.
- Live `prisma migrate status` could not be exercised because the configured PostgreSQL endpoint is unreachable from the current environment (same caveat carried over from Phase 17). Migration history is prepared and schema is valid; runtime connectivity verification remains pending on an environment with database access.

## Definition of Done Review

- TypeScript passes: yes.
- Backend and frontend build: typecheck clean across the monorepo; production build was not re-executed in this session (typecheck + tests + Prisma generate are the gating criteria established by the project).
- Migration prepared and schema valid: yes.
- Migration runtime status against live DB: pending external connectivity (same caveat as prior phases).
- Critical tests pass: yes (587/587).
- APIs follow `/api/v1` conventions: yes (all new endpoints under the standard prefix, response format follows `success`/`data` envelope, errors via `HttpException`).
- UI usable and responsive: yes — group manager, peer review config, plagiarism panel, showcase manager, AI approval queue, caption cue editor, learner portfolio, learner peer reviews, public portfolio, and the instructor advanced assignment page.
- RBAC enforced: yes — every new controller method is gated by `@Permissions(...)` (e.g. `courses:read`, `courses:update`, `assignments:grade`) and the service runs all queries through organization-scoped Prisma lookups.
- Tenant isolation enforced: yes — every advanced-assignment query starts from `organizationId` plus an explicit ownership check; showcase/portfolio cross-tenant access throws `NotFoundException`.
- Audit logs for sensitive operations: yes — peer review match generation, peer review submission, plagiarism run, group member changes, AI item approve/reject/publish, and portfolio visibility toggle all emit audit log entries.

## Bugs Found And Fixed During Verification

- Fixed wrong relative import depth in advanced-assignment components (`../../ui/*` and `../../../lib/*` -> `../ui/*` and `../../lib/*`) plus a missing `Textarea` re-export (`components/ui/textarea.tsx`).
- Fixed `useCourse` reference in the instructor advanced assignment page (replaced with `useAssignment` and made collaboration fields optional on the `Assignment` type).
- Fixed `QueryState` misuse (`isReady` -> `!loading`) in the peer review manager hydration effect.
- Fixed `result.cues[0].text` access in the caption cue editor spec by narrowing through `as Array<{ text: string }>`.
- Removed obsolete `AiDraftCard` and the unused `AiGeneratedItem` import from the instructor builder now that the approval queue replaces the read-only preview.

## Recommendations For Next Phase

- Phase 19 (Global Search): reuse the new `AdvancedAssignmentService` and AI item services to index groups, peer reviews, and AI drafts.
- Phase 20 (Localization): externalize the copy in the new components (currently in English) once locale preference plumbing is added.
- Phase 25 (Bulk Operations): bulk approve/reject AI drafts and bulk-create peer review matches could reuse the existing per-item endpoints.
- Migration: schedule a real `prisma migrate deploy` on a host with database access to confirm runtime migration; current migration SQL has been validated by Prisma generate.
