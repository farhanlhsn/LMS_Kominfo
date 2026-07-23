# Plugin Architecture

The LMS must be modular and plugin-ready.

## Core rule

The LMS core owns users, organizations, RBAC, courses, modules, lessons, activities, enrollments, progress, grades, certificates, files, analytics events, and audit logs.

Plugins may extend behavior through controlled extension points. Plugins must not bypass RBAC, tenant isolation, audit logging, or security rules.

## Distribution model

Every manifest declares one distribution:

- `CORE`: required LMS capability. Available without marketplace installation and cannot be disabled.
- `MARKETPLACE`: optional package. Hidden from activity selectors and blocked at API boundaries until installed and enabled for the active organization.

First-party marketplace adapters may be bundled with an application release, but bundling does not grant tenant access. `OrganizationPlugin` remains the runtime entitlement.

Manifest runtime kinds:

- `INTERNAL`: reviewed first-party adapter compiled with the release.
- `DECLARATIVE`: data/config-driven extension rendered by an approved core host.
- `REMOTE_IFRAME`: isolated HTTPS UI surface. It must use a scoped bridge and must not receive the LMS session token.

Arbitrary third-party JavaScript, PHP, or uploaded executable code must never load into the API process.

## Plugin categories

- ACTIVITY
- CONTENT
- ASSESSMENT
- AI_TOOL
- INTEGRATION
- PAYMENT_PROVIDER
- NOTIFICATION_CHANNEL
- STORAGE_PROVIDER
- VIDEO_PROVIDER
- PROCTORING_PROVIDER
- ANALYTICS
- CERTIFICATE_REQUIREMENT

## Activity key strategy

Avoid hardcoding all activity types as database enums. Use flexible keys:

- `core.text`
- `core.video`
- `core.file`
- `core.link`
- `core.quiz`
- `core.assignment`
- `core.discussion`
- `core.live_session`
- `plugin.3d_viewer`
- `plugin.code_runner`
- `plugin.h5p`
- `plugin.scorm`

Activity model must support:

- activityTypeKey
- pluginKey nullable
- pluginVersion nullable
- config JSON
- content JSON
- completionRule JSON
- gradingRule JSON nullable
- metadata JSON

## Data model

Plugin:

- id
- key
- name
- description
- version
- category
- status: DRAFT, ACTIVE, DISABLED, DEPRECATED
- author
- manifest JSON
- configSchema JSON
- permissions JSON
- capabilities JSON

OrganizationPlugin:

- id
- organizationId
- pluginId
- enabled
- config JSON
- installedById
- installedAt

PluginExecutionLog:

- id
- organizationId
- pluginId
- userId nullable
- action
- status: SUCCESS, FAILED
- input JSON nullable
- output JSON nullable
- error nullable
- durationMs
- createdAt

## Extension points

- ActivityRenderer
- ActivityEditor
- ActivityCompletionEvaluator
- AssessmentGrader
- ContentProcessor
- AiIndexingProvider
- AnalyticsEventProvider
- NotificationTrigger
- CertificateRequirementProvider
- AdminSettingsPanel
- IntegrationProvider

## Lifecycle

- install
- enable
- disable
- configure
- update
- deprecate
- uninstall

Marketplace lifecycle is authoritative:

1. Install validates published listing, compatibility, organization policy, and manifest.
2. Install creates `PluginInstallation` and `OrganizationPlugin` in one transaction.
3. Enable or disable updates both records.
4. Uninstall removes tenant entitlement and registered panels.
5. Existing activities and plugin-owned records are retained. They render an unavailable state until a compatible package is installed again.

All lifecycle changes create audit and plugin execution logs.

Plugin capabilities are registered as namespaced permission definitions such as
`plugin.3d_viewer:render_activity`. Marketplace capability access also checks
tenant installation state at request time. Disabling or uninstalling a plugin:

- immediately makes its capabilities fail closed for that organization;
- preserves role assignments, overrides, course activities, progress, and
  plugin-owned records;
- marks plugin contexts unavailable instead of deleting them;
- lets course and admin screens render a controlled unavailable state;
- restores retained configuration when a compatible package is installed
  again.

A plugin row installed but missing from runtime manifest is treated as
`PLUGIN_MISSING`, not as enabled code.

## Initial implementation strategy

Start with internal plugins registered in the codebase through PluginRegistry. Do not implement arbitrary third-party plugin installation in MVP.

Later phases may add plugin marketplace, external plugin package upload, review workflow, compatibility checks, and sandboxing.

Current optional catalog packages:

- `plugin.ai_provider`
- `plugin.ai_course_indexer`
- `plugin.ai_tutor`
- `plugin.ai_content_studio`
- `plugin.ai_question_generator`
- `plugin.ai_grading_assistant`
- `plugin.3d_viewer`
- `plugin.code_runner`
- `plugin.h5p`
- `plugin.scorm`

These packages must be installed through Plugin Marketplace. They are not core activity types.

AI feature packages declare dependencies in manifest. Marketplace refuses enable or
install when required packages are inactive, and refuses disabling a package while an
active dependent needs it. Current chain:

- provider -> indexer -> learner tutor
- provider + indexer -> question generator
- provider -> content studio
- provider -> grading assistant

`plugin.ai_provider` owns organization-scoped model and endpoint config. API key is
stored in `PluginSecret` using AES-256-GCM, keyed by organization, plugin, and secret
name. Plaintext never enters `OrganizationPlugin.config`, audit metadata, execution
logs, or API responses. Admin API returns only configured state and last four
characters.

## Moodle interoperability

Moodle PHP plugins cannot be executed directly because they depend on Moodle globals, database tables, capabilities, forms, events, cron, and rendering APIs.

Supported direction:

- LTI 1.3 Advantage bridge for hosted Moodle tools
- SCORM, H5P, and xAPI interoperability
- `.mbz` course/content importer
- package-specific adapters for selected Moodle activity plugins

Direct Moodle plugin ZIP execution would require a separate Moodle/PHP runtime. Treat that runtime as an isolated integration provider, never as code loaded into NestJS.

## Required backend components

- PluginModule
- PluginRegistry
- PluginManifestValidator
- PluginPermissionService
- PluginConfigService
- PluginEventBus
- PluginExecutionLogger

## Required frontend components

- PluginRendererRegistry
- PluginEditorRegistry
- PluginAdminSettingsRegistry
- PluginActivityRenderer
- PluginActivityEditor

## Endpoints

- `GET /api/v1/admin/plugins`
- `GET /api/v1/admin/plugins/:pluginKey`
- `POST /api/v1/admin/plugins/:pluginKey/enable`
- `POST /api/v1/admin/plugins/:pluginKey/disable`
- `PATCH /api/v1/admin/plugins/:pluginKey/config`
- `PUT /api/v1/admin/plugins/:pluginKey/secrets/:secretKey`
- `DELETE /api/v1/admin/plugins/:pluginKey/secrets/:secretKey`
- `GET /api/v1/admin/plugins/:pluginKey/logs`
- `GET /api/v1/plugins/activity-types`
