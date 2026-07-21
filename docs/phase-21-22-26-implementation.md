# Phase 21, 22, 26 Implementation Notes

This document captures the implementation decisions for the Data
Governance (Phase 21), OAuth + MFA + CAPTCHA + Session Hardening
(Phase 22) and Moderation + Legal Consent (Phase 26) modules.

## Shared infrastructure

- New Prisma migration: `packages/db/prisma/migrations/20260706075000_phase_21_22_26/migration.sql`
- New schema slice appended to `packages/db/prisma/schema.prisma`:
  - `LegalDocument`, `ConsentRecord`, `DataExportRequest`,
    `AnonymizationRequest`, `RetentionPolicy`, `BackupJob` (Phase 21)
  - `OAuthAccount`, `MfaFactor`, `RefreshSession`, `LoginAttempt`,
    `CaptchaChallenge` (Phase 22)
  - `ModerationReport`, `ModerationAction`, `ContentFlag`,
    `LegalAcceptanceLog` (Phase 26)
- Relations added to `User` and `Organization` to keep cascade behaviour
  consistent with the rest of the LMS.
- New modules registered in `apps/api/src/app.module.ts`:
  - `GovernanceModule` (global, exports `RetentionPolicyService` and
    `BackupService` for cross-module use)
  - `AuthHardeningModule` (global, exports `MfaService`, `CaptchaService`,
    and `SessionService`)
  - `ModerationModule`

## Phase 21 - Data Governance

### Domain model

- `LegalDocument` represents a versioned policy (terms, privacy, DPA).
  `version` is an integer scoped to a `documentKey` (`terms`, `privacy`,
  `dpa`, `aup`).
- `ConsentRecord` is a per-user, per-document version acceptance record
  with the IP, user agent, and signed payload hash.
- `DataExportRequest` tracks a user's right-to-access export job. It can
  be `PENDING`, `RUNNING`, `COMPLETED`, or `FAILED` and stores the
  generated artifact URL.
- `AnonymizationRequest` is the right-to-erasure flow. It supports a
  configurable grace period before destructive anonymization runs.
- `RetentionPolicy` is per-entity-type (e.g. `DiscussionPost`,
  `LoginAttempt`, `RealtimeEvent`) with `retainDays` and
  `anonymizeAfterDays`.
- `BackupJob` records full/incremental backups with provider, status, and
  checksum.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/governance/legal-documents` | List all policy documents with current version |
| GET    | `/governance/legal-documents/:key` | Get a specific document and current version |
| POST   | `/governance/legal-documents` | Admin: create new version of a policy |
| POST   | `/governance/consent` | User: record acceptance of a policy version |
| GET    | `/governance/consent` | User: list the user's acceptances |
| POST   | `/governance/data-export` | User: queue an export of personal data |
| GET    | `/governance/data-export/:id` | User: poll export status |
| POST   | `/governance/anonymization` | User: request anonymization |
| GET    | `/governance/retention` | Admin: list retention policies |
| PUT    | `/governance/retention/:entityType` | Admin: upsert retention policy |
| GET    | `/governance/backups` | Admin: list backup jobs |
| POST   | `/governance/backups` | Admin: queue a backup |

### Retention execution

`RetentionPolicyService.run()` is invoked by a daily cron task (see
`apps/api/src/governance/governance.cron.ts`). It batches deletes for
entities whose `retainDays` is exceeded, then anonymizes (clears PII
columns) for entities whose `anonymizeAfterDays` is exceeded. Each run
emits audit log entries with the count of affected rows.

## Phase 22 - OAuth, MFA, CAPTCHA, Sessions

### OAuth

- `OAuthAccount` links an external identity provider (`google`,
  `microsoft`, `github`, `okta`, `azure-ad`) to a user. The `provider`
  and `providerAccountId` composite is unique.
- `POST /auth/oauth/:provider/start` returns the redirect URL with a
  CSRF state token persisted in `OAuthAccount` (state column).
- `POST /auth/oauth/:provider/callback` exchanges the code, resolves the
  user, and issues a refresh session.
- Linking/unlinking is exposed under `/auth/oauth/accounts`.

### MFA

- `MfaFactor` stores TOTP secrets (encrypted at rest using a key from
  `process.env.MFA_ENC_KEY`) and recovery codes (hashed with bcrypt).
- `POST /auth/mfa/setup` issues a secret + QR; `POST /auth/mfa/verify`
  confirms the first code and activates the factor.
- `POST /auth/mfa/disable` requires a valid TOTP code or recovery code.
- Login flow is `password -> optional mfa challenge -> refresh session`.

### Session hardening

- `RefreshSession` stores the refresh token family, the hashed token, the
  user agent, the IP, and `expiresAt`. Rotation produces a new
  `RefreshSession` and revokes the old one.
- `LoginAttempt` records each login (success/failure) and supports
  exponential lockout: 5 failed attempts within 10 minutes lock the
  account for 15 minutes.
- `SessionService` is a singleton; controllers call
  `SessionService.rotate(refreshToken)` on every refresh.

### CAPTCHA

- `CaptchaChallenge` stores the challenge id, expected answer (hashed),
  expiry, and consumed flag.
- `POST /auth/captcha/challenge` issues a challenge (image or math).
- `POST /auth/captcha/verify` consumes a challenge.
- CAPTCHA is required on register, password reset, and after 3 failed
  login attempts.

## Phase 26 - Moderation + Legal Consent

### Domain model

- `ModerationReport` is a per-entity (`Course`, `DiscussionPost`,
  `Message`, `Certificate`) complaint with `reason`, `details`, and
  `status` (`OPEN`, `INVESTIGATING`, `RESOLVED`, `DISMISSED`).
- `ModerationAction` is the resolution record (warn, hide, delete,
  suspend, ban) and references the moderator.
- `ContentFlag` is an automated pre-moderation flag (toxicity,
  harassment, PII) emitted by the AI moderation provider.
- `LegalAcceptanceLog` is the append-only audit log of policy
  acceptance.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST   | `/moderation/reports` | User: report content |
| GET    | `/moderation/reports` | Moderator: list reports (filter by status) |
| POST   | `/moderation/reports/:id/actions` | Moderator: take action on a report |
| GET    | `/moderation/flags` | Moderator: list automated flags |
| POST   | `/moderation/flags/:id/resolve` | Moderator: resolve a flag |
| GET    | `/moderation/legal-acceptance` | Admin: read legal acceptance log |

### Frontend

- `apps/web/src/app/settings/privacy/page.tsx` lets the user review
  policies, accept them, and trigger a data export or anonymization.
- `apps/web/src/app/admin/governance/page.tsx` is the admin console for
  policies, retention, and backups.
- `apps/web/src/app/admin/moderation/page.tsx` is the moderation queue.
- `apps/web/src/app/settings/security/page.tsx` exposes MFA setup, OAuth
  account linking, and active session list.
- `useConsent`, `useDataExport`, `useModerationReports`, `useMfaSetup`
  hooks wrap the API.

## Verification

See `phase-21-22-26-completion-report.md` for the latest test/run summary.
