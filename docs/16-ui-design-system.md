# UI Design System

## Purpose

This document is the source of truth for LMS frontend UI. Future frontend work must follow this design system before introducing page-specific patterns or one-off components.

The goal is a consistent, accessible, multi-tenant learning product that can support learner, instructor, admin, and public experiences without hardcoded organization branding.

## Visual Direction

The UI should feel:

- modern
- clean
- professional
- SaaS-like
- learning-focused
- responsive
- accessible
- spacious
- dashboard-oriented

Interfaces should prioritize clarity, scannability, and repeat use. Learning and administration screens should feel like productive application surfaces, not marketing pages.

## Tech Stack

Use the established frontend stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- React Hook Form
- Zod
- TanStack Query if client-side server state is needed
- Recharts if charts are needed

Prefer framework, design-system, and shared component patterns over page-local custom UI.

## Branding Rules

- Default UI must use generic LMS branding.
- Do not hardcode organization-specific names, city names, province names, government names, institution names, or tenant names in generic UI.
- Organization and tenant branding is allowed only through configuration.
- Tenant branding can customize logo, favicon, primary color, secondary color, accent color, radius, certificate styling, and login background.
- Do not hardcode colors directly in pages.
- Use semantic design tokens and CSS variables.
- Use the same component APIs for default and tenant-branded UI.
- All branding changes must remain compatible with light mode, dark mode readiness, accessibility, and tenant isolation.

## Design Tokens

Frontend styling must use semantic tokens rather than literal color intent.

Required color tokens:

- `background`
- `foreground`
- `card`
- `card-foreground`
- `popover`
- `popover-foreground`
- `primary`
- `primary-foreground`
- `secondary`
- `secondary-foreground`
- `accent`
- `accent-foreground`
- `muted`
- `muted-foreground`
- `border`
- `input`
- `ring`
- `destructive`
- `destructive-foreground`
- `success`
- `success-foreground`
- `warning`
- `warning-foreground`
- `info`
- `info-foreground`

Spacing scale:

- Use a predictable Tailwind-compatible spacing scale.
- Prefer `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`, and `16` for common layout spacing.
- Dense admin tables may use tighter spacing only through reusable table components.
- Page shells should use consistent responsive padding.

Radius scale:

- `none`: square utility surfaces
- `sm`: compact controls
- `md`: default input, button, and card radius
- `lg`: modals, large panels, and learning workspace regions
- `full`: avatars, pills, and circular icon buttons only

Typography scale:

- `xs`: metadata, badges, table helper text
- `sm`: default labels, table rows, secondary copy
- `base`: body text and readable content
- `lg`: card and panel headings
- `xl`: page section headings
- `2xl`: page titles
- Larger display sizes are reserved for public landing pages only.

Shadow scale:

- `none`: default dashboard surfaces
- `sm`: subtle cards, dropdowns, sticky bars
- `md`: popovers and elevated panels
- `lg`: modals and command overlays

Avoid decorative heavy shadows in dense SaaS workflows.

Z-index conventions:

- `10`: sticky headers and table headers
- `20`: dropdowns and popovers
- `30`: drawers and side panels
- `40`: modals and dialogs
- `50`: toasts and global overlays

Do not use arbitrary z-index values unless a reusable component documents the need.

## Theme Modes

- Light mode is the first implementation target.
- Dark mode must be structurally ready through tokens.
- Tenant branding must work in both light and dark mode.
- Fallback colors must exist if tenant branding is missing or invalid.
- Theme mode and organization branding must resolve before rendering branded surfaces when possible.

## Core Layouts

- `PublicLayout`: public marketing, catalog, and tenant-specific public pages.
- `AuthLayout`: login, register, forgot password, reset password, and SSO entry.
- `LearnerDashboardLayout`: learner dashboard, my learning, goals, progress, certificates.
- `InstructorDashboardLayout`: instructor dashboard, course list, course builder, reviews.
- `AdminDashboardLayout`: organization admin and platform admin surfaces.
- `LearningWorkspaceLayout`: lesson playback, activity rendering, curriculum sidebar, right panels, and future advanced workspace modes.
- `SettingsLayout`: profile, organization settings, branding, billing, integrations, and security settings.

Each layout must own navigation structure, responsive behavior, and common loading/error/forbidden states for its area.

## Required Reusable Components

- `AppShell`: root application frame for authenticated areas.
- `PublicNavbar`: public navigation with generic branding or tenant config.
- `PublicFooter`: public footer with generic product links.
- `AuthShell`: centered or split auth frame using configurable tenant branding.
- `DashboardSidebar`: primary authenticated navigation.
- `DashboardTopbar`: search, organization switcher, notifications, and user menu.
- `OrganizationSwitcher`: active organization selector with membership-aware options.
- `UserMenu`: profile, settings, organization actions, logout.
- `PageHeader`: title, description, breadcrumbs, and actions.
- `Breadcrumbs`: hierarchical navigation for nested dashboard pages.
- `StatCard`: compact metric card with icon, value, trend, and loading state.
- `DataTable`: searchable, filterable, paginated table with row actions.
- `EmptyState`: reusable empty state with icon, copy, and optional CTA.
- `LoadingState`: page, section, card, table, and skeleton loading states.
- `ErrorState`: recoverable error surface with retry support.
- `ConfirmDialog`: destructive or sensitive action confirmation.
- `FormSection`: grouped form fields with title, helper text, and validation summary.
- `FileUpload`: accessible upload surface for later content and branding uploads.
- `RichTextEditor`: reusable rich text editing surface for course content.
- `CourseCard`: catalog card with thumbnail, title, metadata, and CTA.
- `CourseProgressCard`: enrolled course card with progress and resume action.
- `CourseStatusBadge`: draft, published, archived, review, and private status.
- `CourseBuilderShell`: instructor builder frame with settings, preview, and publish actions.
- `CurriculumBuilder`: module, lesson, and activity organization with reorder controls.
- `LessonPlayerLayout`: lesson-level layout for activity content.
- `LearningWorkspace`: main learner workspace compatible with advanced layout modes.
- `CurriculumSidebar`: course/module/lesson/activity navigation.
- `ActivityRenderer`: dispatches activity UI by `activityTypeKey`.
- `QuizQuestionCard`: placeholder-compatible component for future quiz phase.
- `AssignmentSubmissionCard`: placeholder-compatible component for future assignment phase.
- `CertificateCard`: placeholder-compatible component for future certificate phase.
- `AiAssistantPanel`: placeholder-compatible component for future AI phase.
- `NotificationDropdown`: notification list and empty state.
- `SearchInput`: consistent search input with keyboard and clear affordances.
- `FilterBar`: filters, chips, reset action, and responsive collapse.
- `Pagination`: page controls and result summary.
- `Tabs`: accessible tab navigation.
- `StatusBadge`: generic status badge.
- `ThemePreviewCard`: theme preview for organization branding settings.

## Page-Level UI Requirements

Landing page:

- Generic product branding.
- Clear public navigation.
- Responsive sections for course discovery, learning workspace, and organization use cases.
- No tenant-specific claims unless rendered from tenant configuration.

Login page:

- Auth layout with tenant branding if available.
- Email/password form.
- SSO entry placeholder when configured.
- Error, loading, disabled, and accessibility states.

Register page:

- Generic registration form.
- Organization creation or invitation-aware copy.
- Validation, loading, success, and error states.

Forgot password page:

- Email input.
- Success state that does not reveal account existence.
- Link back to login.

Dashboard page:

- Role-aware content.
- Stat cards, recent courses, active enrollments, and next actions.
- Loading, empty, error, and forbidden states.

Course catalog page:

- Search and filters.
- Responsive course grid.
- Loading skeleton, empty state, and pagination or infinite scroll.

Course detail page:

- Course hero, thumbnail, metadata, curriculum preview, instructor section, enrollment CTA, and future review/certificate placeholders.

My Learning page:

- Enrolled course progress cards.
- Continue learning section.
- Empty state for no enrollments.
- Filters for active/completed courses when available.

Learning page:

- Learning workspace shell.
- Curriculum sidebar.
- Main activity panel.
- Right panel placeholders for notes, transcript, AI, and discussion.
- Mobile fallback with one active panel at a time.

Instructor dashboard:

- Instructor metrics.
- Recent courses.
- Review and draft shortcuts.
- Empty state for new instructors.

Instructor course list:

- Search, status filters, course table or cards, actions, and pagination.

Course create/edit page:

- Form sections for profile, outcomes, audience, visibility, settings, and publish readiness.
- Validation summary and field-level errors.

Course builder page:

- Course settings, module list, lesson list, activity list, reorder controls, draft/published status, preview, publish action, validation errors, and empty states.

Admin dashboard:

- Organization metrics, users, enrollments, audit shortcuts, and tenant health.

User management page:

- Data table with search, filters, role badges, status, row actions, invite flow, and permission states.

Organization settings page:

- Organization profile, branding, login policy, security settings, and theme preview.

## Course Catalog UI

Course catalog must include:

- search bar
- category filter
- level filter
- duration filter
- course cards
- empty state
- loading skeleton
- pagination or infinite scroll
- responsive grid

Catalog filters must be shareable in URL state when practical. Course cards must remain usable under different tenant themes.

## Course Detail UI

Course detail must include:

- course hero
- thumbnail
- title and subtitle
- objectives
- requirements
- target audience
- curriculum preview
- instructor section
- enrollment CTA
- certificate info
- rating and review placeholder if reviews are not implemented

Course detail must clearly distinguish public, organization-only, private, draft, and archived visibility where relevant.

## Course Builder UI

Course builder must include:

- course settings
- module list
- lesson list
- activity list
- reorder controls
- draft/published status
- preview button
- publish button
- validation errors
- empty state

Builder actions must respect RBAC and course-level roles. Destructive actions require confirmation.

## Learning Workspace UI

Learning workspace must include:

- curriculum sidebar
- main activity panel
- right panel
- notes panel placeholder
- transcript panel placeholder
- AI assistant panel placeholder
- discussion panel placeholder
- layout mode switcher
- focus mode
- theatre mode
- side-by-side-ready layout
- mobile fallback
- compatibility with `docs/08-advanced-learning-workspace.md`

The Phase 02.5 workspace should prepare structure for advanced modes without implementing Phase 05 features fully. It must not implement AI, quiz, assignment, code runner, 3D plugins, or pop-out logic before their phases.

## Forms

- Use consistent labels.
- Provide helper text where needed.
- Show validation errors near fields.
- Include disabled state.
- Include loading state.
- Show required indicators.
- Use accessible error messages.
- Confirm destructive actions.
- Use React Hook Form and Zod for complex forms.

## Tables

- Include search.
- Include filters.
- Include pagination.
- Include loading state.
- Include empty state.
- Include error state.
- Include row actions.
- Provide responsive fallback for mobile.
- Avoid horizontal overflow unless the table is intentionally scrollable with visible affordances.

## Loading, Empty, and Error States

Every major page must include:

- loading state
- empty state
- error state
- permission denied state if relevant

Loading states should use skeletons when layout shape is known. Empty states should explain the next useful action. Error states should offer retry or navigation where possible.

## Responsive Behavior

- Desktop uses sidebar layout for authenticated dashboards.
- Tablet uses collapsible sidebar.
- Mobile uses drawer or bottom navigation depending on context.
- Mobile course catalog uses a single-column or two-column grid based on available width.
- Mobile learning page shows one active panel at a time.
- Pop-out and dual-monitor features are hidden or adapted on mobile.
- Touch targets should be large enough for mobile use.

## Accessibility

- Keyboard navigation must work for primary workflows.
- Focus states must be visible.
- Use semantic HTML.
- Add ARIA labels where native text is not enough.
- Maintain color contrast.
- Controls must be screen-reader friendly.
- Form errors must be announced or associated with fields.
- Modals must trap focus and restore focus on close.
- Video activities should support captions and transcripts when available.
- Icon-only buttons require accessible names.

## Do Not Rules

- Do not create inconsistent one-off UI components.
- Do not hardcode tenant colors in page components.
- Do not hardcode organization-specific branding.
- Do not build desktop-only pages.
- Do not hide loading, error, or empty states.
- Do not bypass reusable layout components.
- Do not use page-local styling where a reusable component or token exists.
- Do not introduce Phase 03 or later product features while aligning UI.
