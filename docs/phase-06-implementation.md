# Phase 06 Implementation Notes

Phase 06 adds the quiz engine and question bank feature with multiple question types, quiz builder, quiz activity integration, attempt/save/submit flow, auto-grading for objective questions, manual grading for essay, quiz results, and progress updates.

## Database

Added quiz engine tables:

- `QuestionBank` - organized question collections, scoped to organization
- `Question` - individual questions with type, stem, and metadata; supports multiple_choice, multiple_answer, true_false, short_answer, essay, fill_in_blank, matching
- `QuestionOption` - answer options for objective question types
- `Quiz` - quiz configuration (passing score, time limit, shuffle, attempt limit)
- `QuizQuestion` - ordered questions within a quiz with point value
- `QuizAttempt` - learner attempt tracking with start/submit times and score
- `QuizAnswer` - individual answer records per question per attempt

## Backend

Added `QuizModule` with instructor and learner endpoints:

Instructor endpoints:

- `GET /api/v1/instructor/question-banks`
- `POST /api/v1/instructor/question-banks`
- `PATCH /api/v1/instructor/question-banks/:bankId`
- `DELETE /api/v1/instructor/question-banks/:bankId`
- `GET /api/v1/instructor/questions`
- `POST /api/v1/instructor/questions`
- `PATCH /api/v1/instructor/questions/:questionId`
- `DELETE /api/v1/instructor/questions/:questionId`
- `GET /api/v1/instructor/quizzes`
- `POST /api/v1/instructor/quizzes`
- `GET /api/v1/instructor/quizzes/:quizId`
- `PATCH /api/v1/instructor/quizzes/:quizId`
- `POST /api/v1/instructor/quizzes/:quizId/publish`
- `POST /api/v1/instructor/quizzes/:quizId/questions`
- `DELETE /api/v1/instructor/quizzes/:quizId/questions/:questionId`
- `PATCH /api/v1/instructor/quizzes/:quizId/questions/reorder`
- `POST /api/v1/instructor/activities/:activityId/quiz`
- `GET /api/v1/instructor/quizzes/:quizId/attempts`
- `GET /api/v1/instructor/quiz-attempts/:attemptId`
- `PATCH /api/v1/instructor/quiz-answers/:answerId/grade`

Learner endpoints:

- `GET /api/v1/learn/activities/:activityId/quiz`
- `POST /api/v1/learn/activities/:activityId/quiz/attempts`
- `PATCH /api/v1/learn/quiz-attempts/:attemptId/answers`
- `POST /api/v1/learn/quiz-attempts/:attemptId/submit`
- `GET /api/v1/learn/quiz-attempts/:attemptId/result`

Auto-grading handles multiple_choice, multiple_answer, true_false, fill_in_blank. Essay questions wait for manual instructor grading. Quiz completion updates activity progress.

## Frontend

Added instructor UI:

- `/instructor/question-banks` - manage question banks
- `/instructor/quizzes` - quiz list and builder
- `/instructor/quizzes/[quizId]` - quiz detail and question management
- `/instructor/quizzes/[quizId]/attempts` - learner attempt review

Added learner UI:

- Quiz activity renderer in learning workspace
- Quiz attempt flow: start, answer, save, submit
- `/learn/quiz-attempts/[attemptId]/result` - result with score and review

## Security

- Instructor quiz endpoints require course management permissions or course instructor access.
- Learner quiz access requires active enrollment.
- Quiz attempts are scoped per learner and enforce attempt limits.

## Verification

- `pnpm db:generate`
- `pnpm db:deploy`
- `pnpm db:seed`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Remaining Notes

- Time-limited quiz auto-submit timer is ready but depends on realtime gateway (Phase 24).
- Question import/export from CSV/XLSX is deferred.
- Randomized question pools are not yet implemented.
