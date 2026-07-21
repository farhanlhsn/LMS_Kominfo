# Phase 11 Implementation Notes

Phase 11 adds learning paths (curated course sequences), skills mapping, XP/points system, leaderboards, and achievements/gamification.

## Database

Added learning path and gamification tables:

- `LearningPath` - curated course sequence with optional prerequisites
- `LearningPathCourse` - ordered courses within a learning path
- `LearningPathEnrollment` - learner enrollment in a learning path
- `Skill` - organization-defined skills
- `CourseSkill` - skills associated with a course
- `UserSkill` - skills earned by a learner
- `XpTransaction` - XP award records with reason, source, and amount
- `LeaderboardSnapshot` - periodic leaderboard rankings
- `Achievement` - achievement definitions (name, icon, criteria)
- `UserAchievement` - achievements earned by a learner

## Backend

Added `LearningPathsModule` and `GamificationModule`:

Learning path endpoints:

- `POST /api/v1/learning-paths`
- `GET /api/v1/learning-paths`
- `GET /api/v1/learning-paths/:idOrSlug`
- `PATCH /api/v1/learning-paths/:id`
- `DELETE /api/v1/learning-paths/:id`
- `POST /api/v1/learning-paths/:id/courses`
- `DELETE /api/v1/learning-paths/:id/courses/:courseId`
- `POST /api/v1/learning-paths/:id/courses/reorder`
- `POST /api/v1/learning-paths/:id/enroll`
- `GET /api/v1/learning-paths/enrollments/mine`

Gamification endpoints:

- `POST /api/v1/skills`
- `GET /api/v1/skills`
- `PATCH /api/v1/skills/:id`
- `DELETE /api/v1/skills/:id`
- `POST /api/v1/courses/:courseId/skills`
- `GET /api/v1/courses/:courseId/skills`
- `GET /api/v1/skills/mine`
- `POST /api/v1/xp/award`
- `GET /api/v1/xp/mine`
- `GET /api/v1/leaderboard`
- `POST /api/v1/leaderboard/snapshot`
- `POST /api/v1/achievements`
- `GET /api/v1/achievements`
- `GET /api/v1/achievements/mine`

Learning path and skill management requires course management permissions. XP endpoints require appropriate context. Leaderboard is organization-scoped.

## Frontend

Added UI pages:

- `/learning-paths` - browse learning paths
- `/learning-paths/[slug]` - learning path detail
- `/achievements` - learner achievements
- `/leaderboard` - organization leaderboard
- `/admin` includes achievement management sections

## Security

- All data is organization-scoped.
- Learning path management requires instructor/admin permissions.
- Learner enrollment in learning paths requires active organization membership.

## Verification

- `pnpm db:generate`
- `pnpm db:deploy`
- `pnpm db:seed`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Remaining Notes

- Automatic XP awarding from course completion and other events is partially wired.
- Achievement criteria evaluation engine is foundational; complex rule evaluation deferred.
- Leaderboard snapshot scheduling depends on external cron/trigger.
