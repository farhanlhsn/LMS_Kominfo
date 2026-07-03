# Architecture Decisions

## ADR-001: REST-first API

Use REST under `/api/v1`. Do not implement GraphQL unless explicitly requested later.

## ADR-002: User global, membership tenant-scoped

A `User` is global. Access to organizations is represented by `OrganizationMember`. Roles and permissions are resolved within the active organization context.

## ADR-003: Multi-tenant from day one

Tenant-scoped resources must include `organizationId` where applicable. Query filters and guards must prevent cross-tenant access.

## ADR-004: Plugin-ready activity model

Use `activityTypeKey` and optional `pluginKey` instead of hardcoding every activity type as database enum. Core activity keys include `core.text`, `core.video`, `core.quiz`, `core.assignment`. Plugins can add keys such as `plugin.code_runner`.

## ADR-005: Provider abstraction

Storage, AI, video, payment, SSO, notification, proctoring, and code execution must use provider interfaces.

## ADR-006: Date and timezone strategy

Store all datetimes in UTC. Store `timezone` on user, organization, live sessions, cohorts, due dates, and calendar events where needed. Display dates using user timezone, falling back to organization timezone.

## ADR-007: Realtime strategy

Use HTTP for normal requests. Use Server-Sent Events or WebSocket for realtime notification, AI streaming, live discussion updates, and multi-window sync if server sync is needed. Use BroadcastChannel for browser window sync.

## ADR-008: AI must be RAG-ready

AI tutor answers for course content must retrieve relevant course material first. If context is not found, AI should say the answer is not available in the course material.

## ADR-009: User-generated code isolation

Never execute learner code inside the API server. Use isolated workers/sandbox providers such as Judge0, Piston, Docker sandbox, or Firecracker microVM.

## ADR-010: Accessibility from UI foundation

All UI components should be keyboard navigable, screen-reader friendly, and designed with WCAG in mind from the beginning.

## ADR-011: Production readiness by phase

Each phase must keep the application runnable and must update docs, migration, tests, and seed where needed.
