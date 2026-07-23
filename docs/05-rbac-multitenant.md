# RBAC and Multi-Tenant Strategy

## Principles

- User is global.
- Organization membership is tenant-scoped.
- Roles can be global or organization-scoped.
- Permissions are checked based on the active organization membership.
- Super Admin can access platform-wide operations.
- Organization Admin can manage only their organization.

## Context-aware capability model

Organization membership roles remain the compatibility baseline. Effective
access is then calculated against a context tree:

1. SYSTEM
2. ORGANIZATION
3. USER or COURSE_CATEGORY
4. COURSE
5. MODULE
6. ACTIVITY
7. PLUGIN

Roles may also be assigned directly to a user at a context. A context
assignment applies to that context and descendants only.

Capability effects match Moodle semantics:

- `INHERIT`: remove local override and use ancestor/default result.
- `ALLOW`: grant for this role at this context.
- `PREVENT`: deny for this role, but a descendant `ALLOW` may replace it.
- `PROHIBIT`: final deny across all descendant contexts and all combined roles.

When multiple active roles apply, any `ALLOW` grants unless any applicable role
has `PROHIBIT`. Missing or inactive capability definitions fail closed.

## Delegation and role switch

`RoleDelegation` controls which actor role may view, assign, override, or switch
to each target role. Possessing `roles:manage` does not make a role globally
assignable outside its organization.

Role switch is scoped to one authenticated session and one context subtree. A
switch never changes stored membership. Returning to normal role is always
available through an authenticated endpoint that does not require the switched
role to retain admin capabilities.

## Role lifecycle

System roles cannot be removed by an organization administrator. Custom role
removal is a soft deactivation:

- inactive role grants no access;
- active role switches using it are cleared;
- assignments, overrides, and delegation references remain for audit and
  potential recovery;
- permission resolution ignores inactive or missing roles without failing a
  page request.

See `18-contextual-rbac-moodle-compatibility.md` for algorithm and API details.

## Required roles

- super_admin
- org_admin
- course_manager
- instructor
- assistant_instructor
- reviewer
- mentor
- learner
- support_admin
- finance_admin

## Membership rules

A user may belong to multiple organizations. Switching organization must re-check membership status and permissions.

Membership statuses:

- INVITED
- ACTIVE
- SUSPENDED
- DEACTIVATED

Suspended or deactivated membership blocks access even if login or SSO succeeds.

## Course-level roles

CourseInstructor role values:

- OWNER
- INSTRUCTOR
- ASSISTANT
- REVIEWER

Publish/approval rules:

- Assistant cannot publish.
- Owner can submit for review.
- Organization Admin or assigned Reviewer can approve based on organization setting.
- Super Admin can override.

## Tenant isolation

Every tenant-scoped query must filter by `organizationId`. Course visibility rules must be explicit:

- PUBLIC
- PRIVATE
- ORGANIZATION_ONLY
- INVITE_ONLY

## Course review workflow

- DRAFT
- SUBMITTED_FOR_REVIEW
- CHANGES_REQUESTED
- APPROVED
- PUBLISHED
- ARCHIVED

## Bulk operations

Admin bulk actions must validate every row and produce import reports:

- import users
- invite users
- bulk enroll learners
- bulk assign roles
- bulk assign cohorts
- bulk issue certificates
