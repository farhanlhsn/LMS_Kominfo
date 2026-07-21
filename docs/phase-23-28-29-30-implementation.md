# Phase 23, 28, 29, 30 Implementation Notes

This document captures the implementation decisions for the Timezone &
Cohort Scheduling (Phase 23), Proctoring (Phase 28), Revenue Share &
Payout (Phase 29) and Multi-currency Tax (Phase 30) modules.

## Shared infrastructure

- New Prisma migration: `packages/db/prisma/migrations/20260706090000_phase_23_28_29_30/migration.sql`
- New schema slice appended to `packages/db/prisma/schema.prisma`:
  - `Cohort`, `CohortMember`, `CohortSchedule`, `UserTimezonePreference` (Phase 23)
  - `ProctoringSession`, `ProctoringEvent`, `ProctoringFlag` (Phase 28)
  - `RevenueShareRule`, `PayoutPeriod`, `Payout`, `PayoutMethod` (Phase 29)
  - `TaxRegion`, `TaxRule`, `TaxCalculation` + 12 default regions and 10
    supported currencies (Phase 30)
- Relations added to `User`, `Organization`, and existing `Course` /
  `Enrollment` models to keep cascade behaviour consistent with the rest
  of the LMS.
- New modules registered in `apps/api/src/app.module.ts`:
  - `SchedulingModule`
  - `ProctoringModule`
  - `PayoutModule`
  - `TaxModule`

## Phase 23 - Timezone & Cohort Scheduling

### Domain model

- `Cohort` belongs to a course, has a `startAt`, `endAt`, `capacity`,
  and a `status` enum (`DRAFT`, `OPEN`, `RUNNING`, `CLOSED`).
- `CohortMember` is a per-user enrollment with `role` (`LEARNER`,
  `MENTOR`, `TA`), `status` (`INVITED`, `ENROLLED`, `DROPPED`,
  `COMPLETED`), and `enrolledAt`.
- `CohortSchedule` is a recurring schedule record (weekday, start time,
  duration) interpreted in the cohort's timezone.
- `UserTimezonePreference` stores the user's IANA timezone, DST
  preference, and default calendar view (day/week).

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/cohorts` | List cohorts (filter by course / status) |
| POST   | `/cohorts` | Instructor: create a cohort |
| GET    | `/cohorts/:id` | Cohort detail with members and schedule |
| PATCH  | `/cohorts/:id` | Instructor: update cohort metadata |
| POST   | `/cohorts/:id/members` | Instructor: add a member |
| DELETE | `/cohorts/:id/members/:userId` | Instructor: remove a member |
| GET    | `/cohorts/:id/schedule` | Resolve the schedule in the caller's timezone |
| GET    | `/users/me/timezone` | Get the current user's timezone preference |
| PUT    | `/users/me/timezone` | Update the current user's timezone preference |

### Timezone resolution

`SchedulingService.resolveSchedule(cohortId, userId)` returns the
recurring schedule expressed in the caller's IANA timezone using
`Intl.DateTimeFormat`. The endpoint also returns the next 5 occurrences
as ISO strings so the frontend can render "next session in 2 days" UI.

### Frontend

- `apps/web/src/app/instructor/courses/[courseId]/cohorts/page.tsx` is
  the cohort management page.
- `apps/web/src/app/learn/cohorts/[cohortId]/page.tsx` is the learner
  view with the timezone-resolved schedule.
- `useCohorts`, `useCohort`, `useUserTimezone`, `useUpdateTimezone` hooks
  wrap the API.

## Phase 28 - Proctoring

### Provider abstraction

Proctoring is fully behind a `PROCTORING_PROVIDER` injection token:

```ts
export const PROCTORING_PROVIDER = Symbol('PROCTORING_PROVIDER');
export interface ProctoringProvider {
  startSession(input: StartSessionInput): Promise<ProctoringSessionResult>;
  ingestEvent(sessionId: string, event: ProctoringEventInput): Promise<void>;
  endSession(sessionId: string): Promise<ProctoringSummary>;
}
```

The default `MockProctoringProvider` simulates webcam, microphone, and
screen-share signals. It emits `ProctoringEvent` rows with a randomized
flag probability so the moderation UI has data to render in dev.

### Domain model

- `ProctoringSession` belongs to an attempt, a user, and a course. It
  stores `startedAt`, `endedAt`, `status` (`ACTIVE`, `COMPLETED`,
  `ABANDONED`, `FLAGGED`), and a `providerSessionId`.
- `ProctoringEvent` records `type` (`FOCUS_LOST`, `MULTIPLE_FACES`,
  `NO_FACE`, `TAB_SWITCH`, `NO_AUDIO`, `BACKGROUND_VOICE`,
  `PHONE_DETECTED`), `occurredAt`, and an optional `metadata` JSON
  column.
- `ProctoringFlag` is the per-session summary of suspicious activity,
  with `severity` (`LOW`, `MEDIUM`, `HIGH`) and `resolvedBy` /
  `resolvedAt` for moderator follow-up.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST   | `/proctoring/sessions` | Learner: start a proctored attempt |
| POST   | `/proctoring/sessions/:id/events` | Ingest a proctoring event |
| POST   | `/proctoring/sessions/:id/end` | End the session and compute the summary |
| GET    | `/proctoring/sessions/:id` | Get session detail + events + flags |
| GET    | `/instructor/proctoring/flags` | Instructor: list unresolved flags |
| POST   | `/instructor/proctoring/flags/:id/resolve` | Instructor: resolve a flag |

### Frontend

- `apps/web/src/components/proctoring/proctoring-panel.tsx` is the
  learner-side overlay (camera preview, "focus lost" warning).
- `apps/web/src/app/instructor/proctoring/page.tsx` is the flag queue.
- `useProctoringSession`, `useStartSession`, `useIngestEvent` hooks wrap
  the API.

## Phase 29 - Revenue Share & Payout

### Domain model

- `RevenueShareRule` is per-organization (or per-course override) and
  stores the `platformPercent`, `instructorPercent`, and
  `coInstructorPercent` (summing to 100).
- `PayoutPeriod` is a billing period (e.g. `2026-06`) with `startAt`,
  `endAt`, and `status` (`OPEN`, `LOCKED`, `PAID`).
- `Payout` belongs to a period and an instructor; it stores the gross
  amount, the platform share, the net amount, the currency, and the
  status (`PENDING`, `APPROVED`, `PROCESSING`, `PAID`, `FAILED`).
- `PayoutMethod` is per-instructor (bank transfer, PayPal, Stripe
  Connect, manual) and stores the verified destination.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/admin/revenue/rules` | Admin: list revenue share rules |
| PUT    | `/admin/revenue/rules/:orgId` | Admin: upsert rule for an org |
| POST   | `/admin/revenue/periods` | Admin: close a period (computes payouts) |
| GET    | `/admin/revenue/payouts` | Admin: list payouts (filter by period / status) |
| POST   | `/admin/revenue/payouts/:id/approve` | Admin: approve a payout |
| POST   | `/admin/revenue/payouts/:id/pay` | Admin: mark a payout as paid (delegates to provider) |
| GET    | `/instructor/payouts` | Instructor: list own payouts |
| GET    | `/instructor/payout-methods` | Instructor: list own payout methods |
| POST   | `/instructor/payout-methods` | Instructor: add a payout method |
| DELETE | `/instructor/payout-methods/:id` | Instructor: remove a payout method |

### Payout computation

`PayoutService.closePeriod(periodId)` iterates all paid enrollments in
the period, applies the org's `RevenueShareRule`, converts the amount
to the instructor's `PayoutMethod.currency` using the tax module's FX
rates, and creates one `Payout` per instructor. Multipliers (e.g.
promo discounts) are deducted from the gross before splitting.

## Phase 30 - Multi-currency Tax

### Default regions

12 default `TaxRegion` rows are seeded:

| Code | Country | Default Currency |
| ---- | ------- | ---------------- |
| US   | United States | USD |
| CA   | Canada | CAD |
| GB   | United Kingdom | GBP |
| DE   | Germany | EUR |
| FR   | France | EUR |
| ES   | Spain | EUR |
| NL   | Netherlands | EUR |
| ID   | Indonesia | IDR |
| SG   | Singapore | SGD |
| AU   | Australia | AUD |
| JP   | Japan | JPY |
| IN   | India | INR |

10 supported currencies: `USD`, `EUR`, `GBP`, `CAD`, `AUD`, `SGD`,
`JPY`, `IDR`, `INR`, `MYR`.

### Domain model

- `TaxRegion` is keyed by ISO 3166-1 alpha-2 code.
- `TaxRule` belongs to a region and an entity type (`COURSE`,
  `SUBSCRIPTION`, `MARKETPLACE`) and stores `rate` (basis points),
  `inclusive` (whether tax is included in the displayed price), and
  `validFrom` / `validTo`.
- `TaxCalculation` records the result of a calculation: `baseAmount`,
  `taxAmount`, `totalAmount`, `currency`, `rate`, and the
  `regionCode` / `ruleId` used.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/admin/tax/regions` | Admin: list tax regions |
| GET    | `/admin/tax/rules` | Admin: list tax rules (filter by region/entity) |
| PUT    | `/admin/tax/rules/:regionCode/:entityType` | Admin: upsert a rule |
| POST   | `/tax/calculate` | Calculate tax for a (region, entity, amount) tuple |
| GET    | `/tax/currencies` | List the 10 supported currencies |

### Calculation rules

`TaxService.calculate({ regionCode, entityType, baseAmount, currency })`
returns the total amount, the tax portion, the effective rate, and the
resolved rule. FX is applied before tax using the rates seeded in
`packages/db/prisma/seed.ts` (refreshed daily by the cron task). The
service is the single source of truth - no controller calculates tax
inline.

## Verification

See `phase-23-28-29-30-completion-report.md` for the latest test/run
summary.
