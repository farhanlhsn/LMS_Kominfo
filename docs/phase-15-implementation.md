# Phase 15 Implementation Notes

Phase 15 adds course reviews and ratings, wishlist, favorite instructors, and recently viewed courses tracking.

## Database

Added social and discovery tables:

- `CourseReview` - course rating (1-5) and text review with moderation status
- `Wishlist` - learner wishlist items linking to courses
- `FavoriteInstructor` - learner preference marking instructors as favorites
- `RecentlyViewedCourse` - per-learner course view history with timestamps

## Backend

Added `ReviewsModule` with endpoints:

Reviews:

- `POST /api/v1/reviews` - create or update course review
- `PATCH /api/v1/reviews/:id` - update own review
- `DELETE /api/v1/reviews/:id` - delete own review
- `GET /api/v1/courses/:courseId/reviews` - list reviews for a course
- `GET /api/v1/admin/reviews` - list all reviews for moderation
- `PATCH /api/v1/admin/reviews/:id/moderate` - moderate a review (approve/reject)

Wishlist:

- `POST /api/v1/wishlist` - add course to wishlist
- `DELETE /api/v1/wishlist/:courseId` - remove from wishlist
- `GET /api/v1/wishlist` - list wishlist

Favorite Instructors:

- `POST /api/v1/favorite-instructors` - mark instructor as favorite
- `DELETE /api/v1/favorite-instructors/:instructorId` - unfavorite
- `GET /api/v1/favorite-instructors` - list favorite instructors

Recently Viewed:

- `POST /api/v1/recently-viewed/:courseId` - record course view
- `GET /api/v1/recently-viewed` - list recently viewed courses

Reviews require an enrolled/completed enrollment in the course. Moderation is available to org admins and course managers.

## Frontend

Added UI pages:

- Course detail page now includes review/rating section
- `/wishlist` - learner wishlist
- `/favorite-instructors` - favorite instructors
- `/recently-viewed` - recently viewed courses
- `/admin/reviews` - review moderation dashboard

## Security

- Reviews are scoped per enrollment to prevent fake reviews.
- Moderation actions create audit log entries.
- Wishlist and favorites are private per learner.

## Verification

- `pnpm db:generate`
- `pnpm db:deploy`
- `pnpm db:seed`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Remaining Notes

- Review helpfulness voting is not yet implemented.
- Automated review flagging for suspicious content deferred.
