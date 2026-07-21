# Phase 03 - Content, File, Video

## Goal

Implement storage abstraction, MinIO provider, file manager, content library, rich text, PDF/file/link/video activities, video watch progress, basic transcript upload, content-processing queues.

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
