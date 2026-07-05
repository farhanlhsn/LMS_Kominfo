# Phase 18 - Advanced Assignment Implementation

## Scope

This phase extends the assignment subsystem with collaborative, peer-reviewed, and showcase workflows. It also fulfils the remaining Phase 17 hardening recommendations for in-place caption cue editing and AI item approval.

## Backend

### Prisma schema (`packages/db/prisma/schema.prisma`)

- New enums: `AssignmentCollaborationMode`, `PeerReviewStatus`, `PlagiarismCheckStatus`.
- New models:
  - `AssignmentGroup` / `AssignmentGroupMember` for group assignment.
  - `PeerReviewConfig`, `PeerReviewMatch`, `PeerReview`, `PeerReviewRubricScore` for peer review.
  - `SubmissionAnnotation` for inline instructor / reviewer feedback.
  - `PlagiarismCheck` storing provider output.
  - `ProjectShowcase` (per course) and `ShowcaseView` (per learner view).
  - `Portfolio` (per learner) and `PortfolioEntry` (per submission/showcase).
- Extended `Assignment` with `collaborationMode`, `groupMinMembers`, `groupMaxMembers`, `maxResubmissions`.
- Extended `AssignmentSubmission` with `groupId`, plus back-references for the new models.

### Migration

- `packages/db/prisma/migrations/20260706050000_phase_18_advanced_assignment/migration.sql` (UTF-8 without BOM, formal `prisma migrate` shape; no `prisma db push` was used).
- Creates 11 tables and adds the new columns + indexes + foreign keys.

### Modules

- `apps/api/src/advanced-assignment/`:
  - `dto/advanced-assignment.dto.ts` — DTOs for groups, peer review, annotations, plagiarism, showcase, portfolio, collaboration.
  - `plagiarism.provider.ts` — `PLAGIARISM_PROVIDER` injection token and a `MockPlagiarismProvider` that returns deterministic similarity scores.
  - `advanced-assignment.service.ts` — orchestrates groups, peer review matching (round-robin with `reviewsRequired`/`reviewsToReceive`), annotations, plagiarism delegation, showcase views, and portfolio auto-creation.
  - `advanced-assignment.controller.ts` — nine `@Controller` classes (instructor / learner / public) with REST endpoints under `/api/v1/instructor/assignments/:id/...`, `/api/v1/learn/...`, `/api/v1/public/...`, and `/api/v1/showcases/:id`.
  - `advanced-assignment.module.ts` — registers the service, the provider, and the injection token.
  - `advanced-assignment.service.spec.ts` — 10 unit tests covering group CRUD with mode validation, peer review config upsert + match generation, plagiarism delegation, annotations, showcase CRUD, portfolio auto-creation + ownership enforcement, and not-found propagation.
- Registered in `apps/api/src/app.module.ts`.

### Assignments core (Phase 18 deltas)

- `CreateAssignmentDto` / `updateAssignment` extended with `collaborationMode`, `groupMinMembers`, `groupMaxMembers`, `maxResubmissions`.
- `createSubmission` enforces the `maxResubmissions` cap.

### AI generated items (Phase 17 hardening)

- `ai-generated-item.service.ts` adds `listForOrganization`, `getItem`, `updateItemContent`, `approveItem`, `rejectItem`, `publishItem` with audit logging.
- `ai.controller.ts` adds `InstructorAiItemsController` (`GET /instructor/ai/items`, `GET /instructor/ai/items/:itemId`, `PATCH /instructor/ai/items/:itemId`, `PATCH /instructor/ai/items/:itemId/approve`, `PATCH /instructor/ai/items/:itemId/reject`, `POST /instructor/ai/items/:itemId/publish`).
- `dto/video-ai.dto.ts` adds `ListAiGeneratedItemsQueryDto` and `UpdateAiGeneratedItemDto`.

### Caption cues (Phase 17 hardening)

- `learning-workspace.service.ts` adds `listCaptionCues`, `createCaptionCue`, `updateCaptionCue`, `deleteCaptionCue`, `reorderCaptionCues` for direct cue editing.
- `learning-workspace.controller.ts` exposes the new endpoints under `/instructor/caption-tracks/:trackId/cues[/:cueIndex]` and `/caption-tracks/:trackId/cues/reorder`.
- `dto/learning-workspace.dto.ts` adds `CreateCaptionCueDto`, `UpdateCaptionCueDto`, `ReorderCaptionCuesDto`.
- Specs gain matching unit tests for the cue editor.

## Frontend

### Types

- `apps/web/src/lib/lms-types.ts` adds `AssignmentCollaborationMode`, `PeerReviewStatus`, `PlagiarismCheckStatus`, `AssignmentGroup`, `AssignmentGroupMember`, `PeerReviewConfig`, `PeerReviewRubricScore`, `PeerReviewMatch`, `PeerReview`, `SubmissionAnnotation`, `PlagiarismMatchedSource`, `PlagiarismCheck`, `ProjectShowcase`, `Portfolio`, `PortfolioEntry`; the `Assignment` interface also gains the new collaboration/resubmission fields.

### API client + hooks

- `apps/web/src/lib/api-client.ts` adds 38 methods covering AI approval, caption cues, group + peer review, annotations, plagiarism, showcase, portfolio, public share, and learner peer review submission.
- `apps/web/src/lib/api-hooks.ts` adds 36 matching React hooks.

### UI primitives

- `apps/web/src/components/ui/button.tsx`, `card.tsx`, `input.tsx`, `textarea.tsx` (re-export of `Textarea`), `select.tsx` — light shadcn-style primitives with the existing brand tokens.
- `apps/web/src/components/hooks/use-api-mutation.ts` — typed `useApiMutation<TArgs>` hook.

### Advanced assignment components

- `apps/web/src/components/advanced-assignment/group-manager.tsx` — collaboration mode, group min/max/resubmission settings, group CRUD, member add/remove.
- `apps/web/src/components/advanced-assignment/peer-review-manager.tsx` — config form, match list, generation trigger.
- `apps/web/src/components/advanced-assignment/plagiarism-panel.tsx` — list + run plagiarism check on a submission.
- `apps/web/src/components/advanced-assignment/showcase-manager.tsx` — per-course project showcase CRUD.
- `apps/web/src/components/advanced-assignment/ai-approval-queue.tsx` — list/approve/reject/publish + inline prompt edit for AI generated items.
- `apps/web/src/components/advanced-assignment/caption-cue-editor.tsx` — direct cue editing (add/edit/delete/reorder) with mm:ss parsing/formatting helpers.

### Pages

- `apps/web/src/app/instructor/assignments/[assignmentId]/page.tsx` — wires the advanced assignment detail view (groups + peer review + showcase) using `useAssignment` (collaboration fields come from the `Assignment` payload).
- `apps/web/src/app/learn/portfolio/page.tsx` — learner portfolio: edit title/description, toggle public, manage entries, see share link.
- `apps/web/src/app/learn/peer-reviews/page.tsx` — peer review submission flow for matches assigned to the learner.
- `apps/web/src/app/p/[shareToken]/page.tsx` — public portfolio view.
- `apps/web/src/app/instructor/courses/[courseId]/assignments/page.tsx` — adds an `Advanced` action linking to the per-assignment advanced page.

### Instructor builder integration

- `apps/web/src/app/instructor/courses/[courseId]/builder/page.tsx`:
  - Caption track card now has an `Edit cues` toggle; selecting a track renders the new `CaptionCueEditor` inline.
  - The AI generated drafts section now renders the new `AiApprovalQueue` (replacing the read-only preview card) so instructors can approve, reject, edit, and publish AI items directly.

## Verification

- `pnpm db:generate` — passes; Prisma client regenerated against the Phase 18 schema.
- `pnpm -r typecheck` — passes for `@lms/api`, `@lms/web`, `@lms/db`, `@lms/shared`, `@lms/config`.
- `pnpm -r test` — passes: 407 API tests, 165 web tests, 12 config tests, 3 shared tests, total 587/587.
- `prisma migrate status` could not be exercised because the configured PostgreSQL endpoint is unreachable from the current environment (same caveat as Phase 17); the migration SQL itself is valid.
