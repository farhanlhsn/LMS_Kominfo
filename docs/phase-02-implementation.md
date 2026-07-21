# Phase 02 Implementation Notes

Phase 02 adds the Core LMS MVP without implementing later quiz, assignment, AI, certificate, payment, SSO, or plugin marketplace features.

## Backend

- Added tenant-scoped course categories, courses, instructors, modules, lessons, activities, activity content, enrollments, activity progress, and learning events.
- Activity extensibility uses `activityTypeKey` strings such as `core.text`, `core.video`, `core.file`, and `core.link`.
- Course management APIs require Phase 01 auth, organization context, and course permissions.
- Learner APIs require active enrollment before learning workspace or progress access.

## Frontend

- Added Phase 02 pages for catalog, course detail, my learning, learning workspace, lesson view, and instructor builder screens.
- The UI is a runnable shell over demo data while auth-aware frontend API integration remains a later task.

## Seed Data

- Demo organization gets an instructor, two learners, three categories, two published courses, one draft course, modules, lessons, activities, and enrollments.
- Demo user password for seeded instructor and learner accounts is `ChangeMe123!`.
