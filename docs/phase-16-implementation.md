# Phase 16 Implementation Notes

Phase 16 adds SCORM package import and tracking, H5P content activity, xAPI statement tracking, survey builder, polling activity, and course feedback forms. All learning experience types are plugin-ready with `scorm`, `h5p`, `survey`, `poll`, `feedback` activity type keys.

## Database

Added experience type tables:

- `ScormPackage` - uploaded SCORM package with version, manifest, and file reference
- `ScormAttempt` - learner SCORM session tracking with state and score
- `H5PContent` - H5P content metadata with file reference and parameters
- `H5PResult` - learner H5P interaction results
- `XapiStatement` - stored xAPI statements with actor, verb, object, and result
- `XapiActivityState` - xAPI activity state and profile storage
- `Survey` - survey with title, description, and settings
- `SurveyQuestion` - survey questions with type and order
- `SurveyResponse` - learner survey response records
- `SurveyAnswer` - individual answer data per question
- `Poll` - poll questions with options and settings
- `PollVote` - learner poll votes
- `CourseFeedback` - course feedback submissions with rating and comments

## Backend

Added `ExperiencesModule` organized by controllers:

SCORM:

- `GET /api/v1/scorm/packages` - list packages
- `POST /api/v1/scorm/packages` - upload SCORM package
- `GET /api/v1/scorm/packages/:id` - get package detail
- `PATCH /api/v1/scorm/packages/:id` - update package
- `DELETE /api/v1/scorm/packages/:id` - delete package
- `GET /api/v1/scorm/packages/:packageId/attempts` - list attempts
- `POST /api/v1/scorm/packages/:packageId/attempts` - start attempt
- `PATCH /api/v1/scorm/attempts/:attemptId` - commit state

H5P:

- `GET /api/v1/h5p/contents` - list H5P content
- `POST /api/v1/h5p/contents` - create H5P content
- `GET /api/v1/h5p/contents/:id` - get content
- `PATCH /api/v1/h5p/contents/:id` - update content
- `DELETE /api/v1/h5p/contents/:id` - delete content
- `GET /api/v1/h5p/contents/:contentId/results` - list results
- `POST /api/v1/h5p/contents/:contentId/results` - submit result

xAPI:

- `GET /api/v1/xapi/statements` - query xAPI statements
- `POST /api/v1/xapi/statements` - post xAPI statement
- `GET /api/v1/xapi/state` - get activity state
- `PUT /api/v1/xapi/state` - put activity state
- `DELETE /api/v1/xapi/state` - delete activity state

Surveys:

- `GET /api/v1/surveys` - list surveys
- `POST /api/v1/surveys` - create survey
- `GET /api/v1/surveys/:id` - get survey with questions
- `PATCH /api/v1/surveys/:id` - update survey
- `DELETE /api/v1/surveys/:id` - delete survey
- `POST /api/v1/surveys/:id/questions` - add question
- `DELETE /api/v1/surveys/:id/questions/:questionId` - remove question
- `POST /api/v1/surveys/:id/responses` - submit response
- `GET /api/v1/surveys/:id/responses` - list responses
- `GET /api/v1/surveys/:id/responses/export` - export responses

Polls:

- `GET /api/v1/polls` - list polls
- `POST /api/v1/polls` - create poll
- `GET /api/v1/polls/:id` - get poll
- `PATCH /api/v1/polls/:id` - update poll
- `DELETE /api/v1/polls/:id` - delete poll
- `POST /api/v1/polls/:id/votes` - vote
- `GET /api/v1/polls/:id/results` - get poll results

Course Feedback:

- `GET /api/v1/course-feedback` - list feedback (admin)
- `POST /api/v1/course-feedback` - submit feedback (learner)
- `GET /api/v1/course-feedback/export` - export feedback

## Frontend

Added UI pages:

- `/admin/surveys` - survey management
- `/admin/surveys/[id]` - survey detail with responses
- `/admin/polls` - poll management
- `/admin/xapi` - xAPI statement viewer
- `/admin/feedback` - course feedback management
- `/learn/surveys` - learner survey view
- `/learn/polls` - learner polling view

## Security

- SCORM, H5P, survey, poll, and feedback management requires course management or admin permissions.
- Learner submission access requires active enrollment.
- xAPI statements are scoped per organization.
- All data is organization-scoped.

## Verification

- `pnpm db:generate`
- `pnpm db:deploy`
- `pnpm db:seed`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Remaining Notes

- SCORM runtime API is a REST translation layer; full SCORM RTE browser API requires a client-side bridge.
- H5P client-side rendering requires the H5P core library in the frontend bundle (deferred).
- xAPI LRS compatibility covers basic statement/state/profile verbs; LRS-specific endpoints (agents, activities) deferred.
- Survey/poll analytics and result visualization improvements are post-MVP.
