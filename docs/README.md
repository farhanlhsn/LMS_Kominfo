# LMS Documentation Index

Use this folder as the source of truth for Codex. Do not paste the full context on every task. Read only the relevant files for the feature being implemented.

## Core docs

- `00-product-vision.md` - product vision and complete feature scope
- `01-architecture-decisions.md` - architecture decisions that affect all phases
- `02-tech-stack.md` - recommended stack and infrastructure
- `03-database-model.md` - main database entities and conventions
- `04-api-standards.md` - REST API, response, errors, pagination, auth headers
- `05-rbac-multitenant.md` - tenant isolation, roles, permissions, organization membership
- `06-sso-strategy.md` - multi-organization SSO strategy
- `07-plugin-architecture.md` - plugin-ready design
- `08-advanced-learning-workspace.md` - Coursera-style side-by-side and dual-monitor learning
- `09-ai-rag.md` - AI tutor, RAG, AI generated content
- `10-security-compliance.md` - security, audit, accessibility, compliance
- `11-realtime-notification.md` - WebSocket/SSE, notification delivery, BroadcastChannel
- `12-video-pipeline.md` - video provider adapter and HLS/DASH readiness
- `13-coding-3d-plugins.md` - code runner and 3D content plugin requirements
- `14-monetization-payout.md` - marketplace, subscriptions, payout, multi-currency
- `15-accessibility-localization.md` - WCAG, localization, timezone, content language
- `16-ui-design-system.md` - frontend UI design system, reusable components, layouts, and page requirements
- `17-theme-branding-customization.md` - tenant theme and branding customization strategy

## Phase docs

See `docs/phases/`.

Important phase docs:

- `phases/phase-02-5-ui-design-system-alignment.md` - UI design system and frontend alignment before Phase 03

## Implementation notes

- `phase-00-implementation.md` - concrete scaffold, commands, and environment notes for Phase 00
- `phase-01-implementation.md` - auth, RBAC, sessions, and tenant context notes for Phase 01
- `phase-02-implementation.md` - Core LMS catalog, builder, enrollment, and progress notes for Phase 02
- `phase-02-5-implementation.md` - UI design system alignment and theme token notes for Phase 02.5
- `phase-03-implementation.md` - file, video, rich content, content library, and processing queue notes for Phase 03
- `phase-03-2-app-flow-hardening.md` - app flow hardening before Phase 04
- `phase-04-implementation.md` - internal plugin registry, plugin APIs, admin UI, and activity renderer foundation notes for Phase 04

Recommended initial order:

1. Phase 00 - Project Foundation
2. Phase 01 - Auth, RBAC, Multi-Tenant
3. Phase 02 - Core LMS MVP
4. Phase 02.5 - UI Design System and Frontend Alignment
5. Phase 03 - Content, File, Video
6. Phase 04 - Plugin Architecture Foundation
7. Phase 05 - Advanced Learning Workspace Foundation
8. Phase 06 - Quiz Engine
9. Phase 07 - Assignment, Certificate, Goals
10. Phase 08 - AI RAG
11. Continue through the remaining phase files.

## Archive

The original full long context is stored in `docs/archive/full-context-v5-advanced-workspace.txt`.
For compatibility with older prompts, an alias copy also exists at `docs/archive/full-context-v5.txt`.
Use the archive only for audit or if a detail is missing from the split docs.

## Prompting Codex

Example:

```txt
Implement Phase 02 Core LMS.
Read AGENTS.md, docs/README.md, docs/phases/phase-02-core-lms.md, docs/03-database-model.md, docs/04-api-standards.md, and docs/05-rbac-multitenant.md.
Do not implement later features except where needed for extensibility.
Keep the app buildable.
```
