# Phase 31 - 3D Interactive Content Plugin

## Goal

Implement internal 3D viewer plugin with GLB/GLTF support, hotspots, annotations, completion rules, analytics, workspace panels, pop-out preview.

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
