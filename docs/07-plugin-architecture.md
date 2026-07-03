# Plugin Architecture

The LMS must be modular and plugin-ready.

## Core rule

The LMS core owns users, organizations, RBAC, courses, modules, lessons, activities, enrollments, progress, grades, certificates, files, analytics events, and audit logs.

Plugins may extend behavior through controlled extension points. Plugins must not bypass RBAC, tenant isolation, audit logging, or security rules.

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

## Initial implementation strategy

Start with internal plugins registered in the codebase through PluginRegistry. Do not implement arbitrary third-party plugin installation in MVP.

Later phases may add plugin marketplace, external plugin package upload, review workflow, compatibility checks, and sandboxing.

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
- `GET /api/v1/admin/plugins/:pluginKey/logs`
- `GET /api/v1/plugins/activity-types`
