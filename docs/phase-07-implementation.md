# Phase 07 Implementation Notes

Implemented assignment activities, rubric grading, certificate templates and issuing, public certificate verification, and learner goals.

Key boundaries:

- Assignment activities use `core.assignment` and stay plugin-renderer ready.
- Assignment, submission, rubric, certificate, and goal data is organization-scoped.
- Learner assignment access requires enrollment.
- Instructor assignment, grading, certificate issue, and revoke flows require course management permissions or course instructor access.
- Phase 07.1 generates a private PDF certificate with a QR verification URL when a certificate is issued. The managed file is linked through `pdfFileId`, generation state is tracked, learner and course-manager downloads use short-lived signed URLs, and failed rendering does not invalidate the certificate record.
- Public verification exposes only the learner display name, course and organization names, issue/expiry dates, certificate identifiers, and the derived valid/revoked/expired status. It does not expose a public PDF URL.

Verification notes:

- Prisma schema validates.
- Typecheck and lint pass.
- Build passes.
- Root test suite passes.
- Migration deploy and seed pass against the configured database.
