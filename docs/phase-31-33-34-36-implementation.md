# Phase 31, 32, 33, 34, 36 Implementation Notes

This document captures the implementation decisions for the 3D Content
Plugin (Phase 31), Code Runner Plugin (Phase 32), Plugin Marketplace
(Phase 33), Popout Dual Monitor (Phase 34) and Plugin Workspace Panels
(Phase 36) modules.

## Shared infrastructure

- New Prisma migration: `packages/db/prisma/migrations/20260706100000_phase_31_32_33_34_36/migration.sql`
- New schema slice appended to `packages/db/prisma/schema.prisma`:
  - `ThreeDAsset`, `ThreeDScene`, `ThreeDInteraction` (Phase 31)
  - `CodeExecution`, `CodeExecutionTestCase`, `CodeSubmission` (Phase 32)
  - `PluginListing`, `PluginReview`, `PluginInstallation`, `PluginPolicy` (Phase 33)
  - `PopoutSession` (Phase 34)
  - `PluginPanel`, `UserPanelLayout` (Phase 36)
- Relations added to `User`, `Organization`, and existing `Course` /
  `Activity` models to keep cascade behaviour consistent with the rest
  of the LMS.
- New modules registered in `apps/api/src/app.module.ts`:
  - `ThreeDModule`
  - `CodeRunnerModule`
  - `PluginMarketplaceModule`
  - `PopoutModule`
  - `PluginPanelModule`

## Phase 31 - 3D Content Plugin

### Domain model

- `ThreeDAsset` stores the asset metadata: `name`, `format` (`GLB`,
  `GLTF`, `FBX`, `OBJ`), `polygonCount`, `textureCount`, `sizeBytes`,
  and the storage key. The file is uploaded through the existing
  storage abstraction.
- `ThreeDScene` composes multiple `ThreeDAsset` rows into a single
  scene. It stores `camera` (JSON: position, target, fov), `lights`
  (JSON array), and `environment` (HDRI key or solid color).
- `ThreeDInteraction` is a hotspot on a scene: `entityType`
  (`ASSET`, `SCENE`, `URL`), `trigger` (`CLICK`, `HOVER`, `PROXIMITY`),
  and a JSON `action` payload.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST   | `/plugins/3d/assets` | Instructor: upload a 3D asset |
| GET    | `/plugins/3d/assets` | List org's 3D assets |
| DELETE | `/plugins/3d/assets/:id` | Delete an asset (cascades to scenes) |
| POST   | `/plugins/3d/scenes` | Instructor: create a scene |
| GET    | `/plugins/3d/scenes/:id` | Get scene detail with assets and interactions |
| PATCH  | `/plugins/3d/scenes/:id` | Update scene camera/lights/environment |
| POST   | `/plugins/3d/scenes/:id/interactions` | Add an interaction hotspot |
| DELETE | `/plugins/3d/interactions/:id` | Remove an interaction |

### Frontend

- `apps/web/src/components/plugins/3d/scene-viewer.tsx` uses
  `@react-three/fiber` + `@react-three/drei` to render the scene.
- `apps/web/src/components/plugins/3d/scene-editor.tsx` is the
  drag-and-drop scene editor (asset tree, camera, lights, hotspots).
- `apps/web/src/app/instructor/courses/[courseId]/3d/page.tsx` is the
  per-course 3D content page.

## Phase 32 - Code Runner Plugin

### Sandbox provider

User-submitted code is executed through a `SANDBOX_PROVIDER` injection
token:

```ts
export const SANDBOX_PROVIDER = Symbol('SANDBOX_PROVIDER');
export interface SandboxProvider {
  run(input: SandboxRunInput): Promise<SandboxRunResult>;
}
```

The default `MockSandboxProvider` spawns a child process via
`child_process.spawn` (NOT `eval` in the main process) and enforces a
strict timeout:

- Default timeout: 5 000 ms.
- Hard maximum timeout (configurable per call): 30 000 ms.
- Memory cap: 256 MB (enforced via `ulimit` on POSIX; best-effort on
  Windows).
- Working directory: a per-execution temp folder.
- Network: blocked via OS-level firewall rule on POSIX; documented as
  best-effort on Windows.

### Domain model

- `CodeExecution` belongs to a course/activity and stores the
  `language` (`python`, `javascript`, `typescript`, `go`, `java`),
  `entrypoint`, `entryArgs` (JSON), and `timeoutMs`.
- `CodeExecutionTestCase` is a per-execution expected output:
  `stdin`, `expectedStdout`, `expectedStderr`, `expectedExitCode`,
  `weight`.
- `CodeSubmission` is a learner attempt: `code`, `status`
  (`PENDING`, `RUNNING`, `PASSED`, `FAILED`, `ERROR`, `TIMEOUT`),
  `stdout`, `stderr`, `durationMs`, `memoryKb`, and a per-test-case
  result JSON.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST   | `/plugins/code/executions` | Instructor: create a code execution + test cases |
| GET    | `/plugins/code/executions/:id` | Get execution + test cases |
| POST   | `/plugins/code/executions/:id/submit` | Learner: submit code, get results |
| GET    | `/plugins/code/submissions/:id` | Get a submission |

### Frontend

- `apps/web/src/components/plugins/code/code-editor.tsx` uses Monaco
  with the language inferred from `CodeExecution.language`.
- `apps/web/src/components/plugins/code/test-case-panel.tsx` lists
  test cases and their pass/fail status.
- `apps/web/src/app/instructor/courses/[courseId]/code/page.tsx` is
  the per-course code runner management page.

## Phase 33 - Plugin Marketplace

### Domain model

- `PluginListing` is the marketplace entry: `name`, `description`,
  `category` (`CONTENT`, `ASSESSMENT`, `INTEGRATION`, `ANALYTICS`),
  `version`, `manifest` (JSON), `publisherId`, and `status` (`DRAFT`,
  `PUBLISHED`, `SUSPENDED`).
- `PluginReview` is a per-user rating (1-5) + comment with a
  `status` (`PENDING`, `APPROVED`, `REJECTED`).
- `PluginInstallation` is per-org install state: `version`, `enabled`,
  `installedAt`, `settings` (JSON).
- `PluginPolicy` is per-org guardrails: `allowAutoUpdate`, `allowBeta`,
  `blockedPlugins` (JSON array of listing ids), `dataResidency`.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/marketplace/plugins` | Browse published plugins (filter by category) |
| GET    | `/marketplace/plugins/:id` | Plugin detail with reviews |
| POST   | `/marketplace/plugins` | Publisher: create / update a listing |
| POST   | `/marketplace/plugins/:id/reviews` | User: post a review |
| POST   | `/marketplace/plugins/:id/install` | Org admin: install for the org |
| DELETE | `/marketplace/plugins/:id/install` | Org admin: uninstall |
| GET    | `/marketplace/policies` | Org admin: get org plugin policy |
| PUT    | `/marketplace/policies` | Org admin: upsert org plugin policy |

### Frontend

- `apps/web/src/app/marketplace/page.tsx` is the catalog with category
  filter and search.
- `apps/web/src/app/marketplace/[pluginId]/page.tsx` is the listing
  detail with reviews and the install button.
- `apps/web/src/app/admin/marketplace/page.tsx` is the org admin
  console for installed plugins and policies.

## Phase 34 - Popout Dual Monitor

### Domain model

- `PopoutSession` belongs to a user and an activity. It stores:
  - `tokenHash` - SHA-256 hash of the popout token (the raw token is
    only returned once at creation time).
  - `expiresAt` - clamped between 60 seconds and 12 hours from
    creation.
  - `lastSeenAt` - updated on heartbeat.
  - `status` (`ACTIVE`, `EXPIRED`, `REVOKED`).
  - `ip`, `userAgent` - audit metadata captured at creation.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST   | `/popout/sessions` | Create a popout session (returns raw token once) |
| GET    | `/popout/sessions/:id` | Instructor: inspect a session |
| POST   | `/popout/sessions/:id/heartbeat` | Extend lastSeenAt and refresh expiry up to cap |
| DELETE | `/popout/sessions/:id` | Revoke the session |

### Security

- The raw token is returned only at creation; subsequent calls use the
  `id` + a server-side hash check.
- TTL is clamped: `min(12h, max(60s, requestedTtl))`. Requests outside
  the range return `400 Bad Request`.
- The popout window is opened from an authenticated parent; the
  `PopoutShell` page re-authenticates using the token via
  `/popout/sessions/:id/heartbeat` on mount.

### Frontend

- `apps/web/src/components/popout/popout-trigger.tsx` opens the
  popout window with the raw token.
- `apps/web/src/app/popout/[id]/page.tsx` is the popout shell that
  resolves the activity and renders the activity-specific UI.

## Phase 36 - Plugin Workspace Panels

### Domain model

- `PluginPanel` is a per-plugin UI surface declaration: `pluginId`,
  `key`, `title`, `icon`, `defaultSize` (JSON), and `allowedContexts`
  (JSON array of `course` / `lesson` / `activity`).
- `UserPanelLayout` is per-user per-context panel arrangement:
  `contextType`, `contextId`, `panels` (JSON array of `{panelId,
  x, y, w, h, visible}`), `updatedAt`.

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/plugins/panels` | List registered plugin panels |
| GET    | `/users/me/panel-layouts | List the caller's saved layouts |
| GET    | `/users/me/panel-layouts/:contextType/:contextId` | Get layout for a context |
| PUT    | `/users/me/panel-layouts/:contextType/:contextId` | Save layout |

### Frontend

- `apps/web/src/components/plugins/panels/panel-grid.tsx` is a
  responsive grid that loads the user's layout and renders the
  registered plugin panels.
- `apps/web/src/components/plugins/panels/panel-picker.tsx` is the
  "Add panel" picker that lists available plugin panels for the
  current context.
- Layout changes are debounced (500 ms) and saved via `PUT`.

## Verification

See `phase-31-33-34-36-completion-report.md` for the latest test/run
summary.
