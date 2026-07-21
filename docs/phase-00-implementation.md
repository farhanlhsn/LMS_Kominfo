# Phase 00 Implementation Notes

Phase 00 created the runnable project foundation for the LMS monorepo.

## Structure

- `apps/api` - NestJS API with global `/api/v1` prefix, validation, standard response interceptor, standard error filter, request logging, Prisma module, and health endpoint.
- `apps/web` - Next.js App Router shell with responsive dashboard layout and API health state.
- `packages/db` - Prisma schema, initial migration SQL, seed script, and Prisma client export.
- `packages/shared` - shared API response contracts, RBAC constants, and plugin-ready core activity keys.
- `packages/config` - shared runtime constants such as API prefix and default ports.
- `docker-compose.yml` - local postgres, redis, minio, api, and web services.
- `docker/` - production-friendly Dockerfiles for API and web.

## Database foundation

The initial Prisma schema includes:

- `User`
- `Organization`
- `OrganizationMember`
- `Role`
- `Permission`
- `RolePermission`
- `MemberRole`
- `UserSession`
- `AuditLog`

The schema keeps users global, memberships tenant-scoped, roles global or organization-scoped, and audit logs organization-aware. Plugin-extensible activity tables are intentionally deferred to the LMS phase, but shared constants already use string activity keys such as `core.video` and `core.quiz`.

## Seed

The seed script creates:

- platform super admin user
- demo organization
- `super_admin`, `org_admin`, and `learner` roles
- foundation permissions using `<module>:<action>` naming
- member-role assignments for the seeded admin
- `system.seed_completed` audit log

## Verification commands

```powershell
pnpm install
pnpm db:generate
pnpm typecheck
pnpm test
pnpm build
pnpm db:migrate
pnpm db:seed
```

`pnpm db:migrate` and `pnpm db:seed` require a reachable PostgreSQL database matching `DATABASE_URL`.
If a local PostgreSQL already owns port `5432`, start Compose with another host port and point `DATABASE_URL` to it:

```powershell
$env:POSTGRES_PORT='55432'
docker compose up -d postgres redis minio
$env:DATABASE_URL='postgresql://lms:lms_password@localhost:55432/lms?schema=public'
pnpm db:migrate
pnpm db:seed
```
