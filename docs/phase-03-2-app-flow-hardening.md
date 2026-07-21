# Phase 03.2 - App Flow Hardening

This pass closes usability gaps found after Phase 03 before starting Phase 04.

## Completed

- Frontend sessions now hydrate role and permission context from `/api/v1/auth/me`.
- Register UI now uses the existing `/api/v1/auth/register` endpoint.
- Organization switching UI uses `/api/v1/auth/organizations` and `/api/v1/auth/switch-organization`.
- Dashboard navigation is filtered by active organization permissions.
- Mobile dashboard navigation opens and closes from the topbar.
- API 403 errors render the reusable forbidden state on main data pages.
- Instructor course list and builder expose duplicate and archive actions.
- Course builder exposes delete course and inline edit/delete for modules, lessons, and activities.
- Web authz tests cover learner, instructor, file, and content-library menu visibility.
- `@lms/db` build no longer runs `prisma generate` automatically to avoid Windows file-lock failures when API/dev processes hold the Prisma engine. Use `pnpm db:generate` explicitly before build after schema changes.

## Verified

- `pnpm db:generate`
- `pnpm db:deploy`
- `pnpm db:seed`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Notes

- No Phase 04 plugin features were implemented.
- No quiz, assignment, certificate, AI, payment, or marketplace features were implemented.
