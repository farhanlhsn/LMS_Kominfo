# Theme and Branding Customization

## Purpose

The LMS must support customizable organization branding while keeping platform defaults generic. Branding must be resolved per active organization and applied through safe design tokens, not hardcoded page styles.

This document defines the theme strategy for future frontend implementation and organization settings work.

## Branding Scope

Tenant branding may customize:

- organization logo
- favicon
- primary color
- secondary color
- accent color
- success, warning, and info optional colors
- border radius
- login background
- dashboard logo
- certificate template style
- email template brand colors
- public course catalog theme if tenant-specific

Branding must never imply a specific government, city, province, institution, or organization in the default/demo UI.

## Default Theme

The default theme must be generic and semantic. Use neutral product language and token names rather than brand-specific names.

Default theme intent:

- `background`: app canvas
- `foreground`: primary readable text
- `card`: elevated or grouped surfaces
- `primary`: main action color
- `secondary`: secondary action or subtle emphasis
- `accent`: attention or highlight color
- `muted`: quiet supporting surfaces
- `border`: dividers and outlines
- `destructive`: destructive or dangerous actions
- `success`: successful state
- `warning`: caution state
- `info`: informational state

The actual color values should live in CSS variables and theme configuration, not page components.

## CSS Variable Strategy

Frontend must use CSS variables such as:

- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--accent`
- `--accent-foreground`
- `--muted`
- `--muted-foreground`
- `--border`
- `--input`
- `--ring`
- `--destructive`
- `--success`
- `--warning`
- `--info`
- `--radius`

Tailwind and shadcn/ui tokens should reference these variables. Components should use semantic classes such as primary, secondary, muted, border, and destructive instead of literal color classes for core UI.

## Theme Resolution Order

Resolve theme values in this priority:

1. User accessibility preference if applicable
2. Organization branding
3. Platform default theme

Examples of user accessibility preferences include increased contrast, reduced motion, and preferred light or dark mode. Organization branding must not override accessibility requirements.

## OrganizationBranding Data Model

Suggested model:

```txt
OrganizationBranding:
- id
- organizationId
- logoFileId nullable
- faviconFileId nullable
- primaryColor nullable
- secondaryColor nullable
- accentColor nullable
- successColor nullable
- warningColor nullable
- infoColor nullable
- radius nullable
- loginBackgroundFileId nullable
- customCss nullable
- certificateDefaultTemplateId nullable
- emailBranding JSON nullable
- createdAt
- updatedAt
```

This model is documentation for future implementation. Do not add it to Prisma until a phase explicitly requires backend branding persistence.

## Theme Validation

- Validate hex colors.
- Reject invalid CSS values.
- Ensure sufficient contrast if possible.
- Provide fallback colors.
- Do not allow unsafe custom CSS in MVP unless sanitized and admin-only.
- Never expose secrets in theme config.
- Validate radius values against an allowed scale.
- Reject URLs or file references the active organization cannot access.
- Keep validation tenant-scoped and audit sensitive branding changes.

## Runtime Theme Loading

Runtime theme flow:

1. Resolve the active organization.
2. Fetch organization branding.
3. Validate or normalize branding values.
4. Apply CSS variables to the document root or layout wrapper.
5. Re-render UI with tokens.
6. Cache branding safely.
7. Fall back to default theme if branding fails.

Branding should be cacheable by organization and invalidated when organization settings change. Do not cache branding in a way that leaks one organization's theme into another organization context.

## Frontend Requirements

- Use Tailwind and shadcn/ui tokens.
- Do not use hardcoded colors like `bg-blue-600` for primary actions.
- Use semantic classes or CSS variable-backed classes.
- Components must work under different tenant colors.
- Theme preview should be available in organization settings.
- Icon, badge, chart, form, table, and navigation colors must use tokens.
- Tenant branding must work with responsive layouts and loading states.

## Admin UI Requirements

Organization admin should eventually be able to:

- upload logo
- set primary color
- set secondary color
- set accent color
- preview theme
- reset to default
- save branding
- validate contrast

Admin branding UI must show validation feedback before saving and should provide a preview across common surfaces such as buttons, cards, alerts, navigation, and learning workspace panels.

## Multi-Tenant Safety

- Branding applies only to the active organization.
- Switching organization must switch branding.
- Public organization pages may load branding by slug or domain.
- Platform admin pages may use platform default unless scoped to an organization.
- Branding assets must be authorized and tenant-scoped.
- Theme config must never expose private organization data to another tenant.
- Branding changes are sensitive organization settings and should create audit logs when implemented.

## Acceptance Criteria for Future Implementation

- Default theme works.
- Organization theme overrides default.
- Invalid colors fall back safely.
- Switching active organization updates branding.
- UI remains accessible.
- No hardcoded tenant colors exist in major pages.
- Theme preview reflects saved and unsaved changes.
- Public tenant pages load the correct organization branding without cross-tenant leakage.
- Dark mode readiness is preserved even if only light mode is enabled initially.
