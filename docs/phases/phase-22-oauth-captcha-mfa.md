# Phase 22 - OAuth, CAPTCHA, MFA

## Goal

Implement public Google/Microsoft OAuth, CAPTCHA/bot protection, failed login protection, TOTP MFA, recovery codes, session management and revoke all sessions.

## Required reading

- `AGENTS.md`
- `docs/README.md`
- Relevant architecture docs for this phase

## Implementation rules

- Keep the app buildable.
- Respect multi-tenancy and RBAC.
- Add or update Prisma migrations when schema changes.
- Add seed data when useful for demo.
- Add tests for critical logic.
- Update docs after implementation.

## Definition of done

- TypeScript passes.
- Backend and frontend build.
- Migrations run.
- Critical tests pass.
- APIs follow `/api/v1` and standard response format.
- UI is usable and responsive.
- Tenant isolation is enforced.
- Audit logs are created for sensitive operations.
