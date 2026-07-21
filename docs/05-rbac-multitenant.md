# RBAC and Multi-Tenant Strategy

## Principles

- User is global.
- Organization membership is tenant-scoped.
- Roles can be global or organization-scoped.
- Permissions are checked based on the active organization membership.
- Super Admin can access platform-wide operations.
- Organization Admin can manage only their organization.

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
