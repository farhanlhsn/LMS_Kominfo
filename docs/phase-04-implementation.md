# Phase 04 Implementation Notes

Phase 04 adds the internal plugin architecture foundation. It does not add an
external marketplace, uploaded plugin packages, dynamic untrusted code loading,
quiz, assignment, AI RAG, payment, 3D viewer, H5P, SCORM, or code runner
runtime behavior.

## Phase 03 Maturity Gate

Phase 03 was verified before implementation with a live API smoke test against
the local database on port `55432`.

Verified:

- learner and instructor login
- API-backed catalog, course detail, My Learning, learning course, lesson, and
  activity content
- enrollment and persisted progress
- rich text, video, link, and file activity content paths
- instructor course/module/lesson/activity create and update flow
- activity content save, file upload, file attachment, content library list,
  content item create, and library item attachment
- no real app pages depending on old demo/static LMS arrays
- TypeScript and production build pass after Phase 04 work

## Database

Added plugin foundation tables:

- `Plugin`
- `OrganizationPlugin`
- `PluginExecutionLog`
- `PluginEventSubscription`
- `PluginPermission`

Added enums:

- `PluginCategory`
- `PluginStatus`
- `PluginExecutionStatus`

The existing `Activity` model already supports the plugin-ready activity shape:
`activityTypeKey`, `pluginKey`, `pluginVersion`, `config`, `content`,
`completionRule`, `gradingRule`, and `metadata`.

Migration:

- `packages/db/prisma/migrations/20260703110237_phase_04_plugin_foundation/migration.sql`

## Backend

Added `PluginsModule` with:

- `PluginRegistry`
- `PluginManifestValidator`
- `PluginPermissionService`
- `PluginConfigService`
- `PluginEventBus`
- `PluginExecutionLogger`

Implemented endpoints:

- `GET /api/v1/admin/plugins`
- `GET /api/v1/admin/plugins/:pluginKey`
- `POST /api/v1/admin/plugins/:pluginKey/enable`
- `POST /api/v1/admin/plugins/:pluginKey/disable`
- `PATCH /api/v1/admin/plugins/:pluginKey/config`
- `GET /api/v1/admin/plugins/:pluginKey/logs`
- `GET /api/v1/plugins/activity-types`

Admin plugin endpoints require `plugins:configure` and use active organization
context. Enable, disable, and config updates are organization-scoped and create
audit/log records. Secret-like config keys are rejected in this phase.

## Internal Plugin Manifests

Internal manifests live in `packages/shared/src/plugins.ts`.

Implemented core activity plugins:

- `core.text`
- `core.video`
- `core.file`
- `core.link`

Reserved placeholders:

- `core.quiz`
- `core.assignment`
- `plugin.3d_viewer`
- `plugin.code_runner`
- `plugin.h5p`
- `plugin.scorm`

Seed enables implemented core plugins for the demo organization and keeps
placeholder plugins disabled/coming soon.

## Frontend

Added plugin registries/components:

- `PluginRendererRegistry`
- `PluginEditorRegistry`
- `PluginAdminSettingsRegistry`
- `PluginActivityRenderer`
- `PluginActivityEditor`

Learning activity rendering now uses `PluginActivityRenderer`, with graceful
fallback for unknown or unavailable activity keys. Instructor activity content
editing uses `PluginActivityEditor`.

Added admin plugin UI:

- `/admin/plugins`
- `/admin/plugins/[pluginKey]`

The admin UI is API-backed and includes loading, empty, error, and permission
states through the existing shell/state components.

## Verification

Commands run:

- `pnpm install`
- `pnpm --filter @lms/db exec prisma format`
- `pnpm db:generate`
- `pnpm --filter @lms/db exec prisma migrate dev --name phase_04_plugin_foundation`
- `pnpm db:seed`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Live smoke result:

- `GET /api/v1/admin/plugins`: 10 plugins
- `GET /api/v1/plugins/activity-types`: 6 activity types
- `core.text` enabled for demo organization
- `core.link` disable, enable, config update, and log retrieval succeeded

## Remaining Notes

- External plugin installation and marketplace governance remain later phases.
- Placeholder plugin manifests are not usable as active learning activities.
- No dynamic user-supplied code is loaded or executed by the API process.
- Safe to continue to Phase 05 from the plugin foundation perspective.
