# Phase 02.5 - UI Design System and Frontend Alignment

## Goal

After Phase 02 Core LMS MVP, align the frontend with a formal design system before Phase 03 adds content/video complexity.

Phase 02.5 is a frontend alignment phase. It should make the existing Phase 02 UI consistent, reusable, responsive, accessible, and ready for tenant theme customization.

## Required Reading

- `AGENTS.md`
- `docs/README.md`
- `docs/16-ui-design-system.md`
- `docs/17-theme-branding-customization.md`
- `docs/08-advanced-learning-workspace.md`
- `docs/phases/phase-02-core-lms.md`

## Scope

- Create reusable UI components.
- Refactor existing Phase 02 frontend pages to use design system components.
- Add loading, empty, error, and forbidden states.
- Improve responsive layout.
- Prepare learning page for future Advanced Learning Workspace.
- Prepare UI for tenant custom branding.
- Do not implement Phase 03 file/video upload.
- Do not implement quiz, assignment, certificate, AI, payment, or plugin features.

## Components to Create or Improve

- `AppShell`
- `PublicNavbar`
- `PublicFooter`
- `AuthShell`
- `DashboardSidebar`
- `DashboardTopbar`
- `OrganizationSwitcher`
- `UserMenu`
- `PageHeader`
- `Breadcrumbs`
- `StatCard`
- `DataTable`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `ConfirmDialog`
- `FormSection`
- `CourseCard`
- `CourseProgressCard`
- `CourseStatusBadge`
- `CourseBuilderShell`
- `CurriculumBuilder`
- `LessonPlayerLayout`
- `LearningWorkspaceShell`
- `ActivityRenderer`
- `SearchInput`
- `FilterBar`
- `Pagination`
- `StatusBadge`
- `ThemeProvider` placeholder
- `ThemePreviewCard` placeholder

Components should be reusable, accessible, token-based, and generic. Do not duplicate page-local card, shell, badge, or state patterns if a shared component can cover the need.

## Pages to Align

- Landing page
- Login/register pages if already implemented
- Dashboard page
- Course catalog page
- Course detail page
- My Learning page
- Learning page
- Instructor course list
- Instructor course create/edit page
- Instructor course builder page

## Theme Customization Foundation

- Add frontend theme token structure if not already present.
- Add CSS variable-based color strategy.
- Add generic default theme.
- Add placeholder support for organization branding.
- Do not fully implement organization branding admin form unless already simple.
- Make sure UI components use semantic tokens.
- Do not hardcode organization-specific branding.
- Do not hardcode primary UI colors in page components.

Theme work in this phase should prepare the frontend for future organization branding persistence. Backend branding persistence is not required unless a future phase asks for it.

## Learning Workspace Alignment

The Phase 02 learning page should become a solid shell for the future advanced learning workspace.

It should include:

- curriculum sidebar
- main activity panel
- right panel structure
- layout mode affordances for future standard, side-by-side, focus, and theatre modes
- placeholders for notes, transcript, AI assistant, and discussion panels
- mobile fallback with one active panel at a time
- activity rendering by `activityTypeKey`

Do not implement pop-out windows, AI behavior, transcript editing, quiz behavior, assignments, code runner, or 3D content in Phase 02.5.

## Loading, Empty, Error, and Forbidden States

Every major page must include appropriate state surfaces:

- loading state
- empty state
- error state
- forbidden or permission denied state if relevant

These states should be implemented as reusable components and then applied consistently across pages.

## Accessibility and Responsiveness

- Use semantic HTML.
- Ensure keyboard navigation for menus, dialogs, tabs, forms, and primary actions.
- Preserve visible focus states.
- Provide accessible labels for icon-only controls.
- Associate form errors with fields.
- Use responsive dashboard layouts.
- Use mobile-friendly learning workspace behavior.
- Keep color contrast acceptable under default and tenant themes.

## Acceptance Criteria

- Existing Phase 02 functionality still works.
- Major pages use reusable components.
- Course catalog looks consistent.
- Course detail page looks consistent.
- Course builder is usable and consistent.
- Learning page has a solid shell ready for Advanced Learning Workspace.
- Loading, empty, error states exist.
- UI is responsive.
- UI is accessible enough for baseline.
- Default/demo UI remains generic.
- Theme tokens allow future organization color customization.
- TypeScript passes.
- Build passes.
- Docs are updated if needed.

## Definition of Done

- No backend business logic is changed unnecessarily.
- No Phase 03 features are implemented.
- No hardcoded organization-specific branding.
- No hardcoded primary UI colors in page components.
- Components are reusable.
- Commands run and results summarized.

## Suggested Implementation Order

1. Review existing Phase 02 frontend pages and shared styles.
2. Add or normalize theme CSS variables and Tailwind token usage.
3. Create reusable state components: loading, empty, error, forbidden.
4. Create shell/navigation/header components.
5. Create course, catalog, progress, and status components.
6. Create builder and curriculum components.
7. Create learning workspace shell and activity renderer.
8. Refactor pages to use reusable components.
9. Run typecheck, tests, and build.
10. Update docs if implementation choices differ from this phase document.
