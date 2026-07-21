# Phase 00 - Project Foundation

## Goal

Create monorepo, apps/web, apps/api, packages/db, packages/shared, packages/config, Docker Compose for postgres/redis/minio/api/web, env examples, health endpoint, basic UI shell, Prisma initial schema, seed super admin and demo organization.

## Required reading

- `AGENTS.md`
- `docs/README.md`
- `docs/00-product-vision.md`
- `docs/01-architecture-decisions.md`
- `docs/02-tech-stack.md`
- `docs/03-database-model.md`
- `docs/04-api-standards.md`
- `docs/05-rbac-multitenant.md`
- `docs/06-sso-strategy.md`
- `docs/07-plugin-architecture.md`
- `docs/10-security-compliance.md`

Phase 00 does not need to fully implement SSO, plugins, AI, payments, notifications, or advanced workspace features. Read those architecture docs only to scaffold the project in a way that will not block later phases.

## Implementation rules

- Keep the app buildable.
- Respect multi-tenancy and RBAC.
- Add or update Prisma migrations when schema changes.
- Add seed data when useful for demo.
- Add tests for critical logic.
- Update docs after implementation.

## Phase 00 audit logging scope

Phase 00 must create the `AuditLog` data model/table and any basic audit logging utility or interface if convenient. However, Phase 00 does not need to generate runtime audit log entries for the health endpoint, initial scaffold, or static UI shell.

If the seed script creates privileged demo users, roles, permissions, or a demo organization, it may create a seed/setup audit entry, but this is optional. Full runtime audit logging for login, role changes, organization changes, content changes, and other sensitive user actions starts in later feature phases.

Sensitive operations in Phase 00 are limited to seed/setup operations such as creating the super admin, demo organization, initial roles, initial permissions, and initial membership.

## Definition of done

- TypeScript passes.
- Backend and frontend build.
- Migrations run.
- Critical tests pass.
- APIs follow `/api/v1` and standard response format.
- UI is usable and responsive.
- Tenant isolation is enforced.
- `AuditLog` model/table exists. Runtime audit entries are required only for Phase 00 seed/setup sensitive operations if those operations are implemented with audit logging; full runtime audit enforcement begins in later phases.
