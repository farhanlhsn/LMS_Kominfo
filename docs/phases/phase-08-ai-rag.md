# Phase 08 - AI Tutor and RAG

## Goal

Implement AI provider abstraction, embedding abstraction, AI documents/chunks, indexing from rich text/PDF/transcript, learner AI tutor, source references, generated quiz draft, approve to question bank, flashcards.

## Required reading

- `AGENTS.md`
- `docs/README.md`
- Relevant architecture docs for this phase

## Implementation rules

- Keep the app buildable.
- Respect multi-tenancy and RBAC.
- Add or update Prisma migrations when schema changes.
- Add seed data when useful for demo.
- Add tests for critical logic.
- Update docs after implementation.

## Definition of done

- TypeScript passes.
- Backend and frontend build.
- Migrations run.
- Critical tests pass.
- APIs follow `/api/v1` and standard response format.
- UI is usable and responsive.
- Tenant isolation is enforced.
- Audit logs are created for sensitive operations.

## Configuration foundation

Phase 08 starts with a typed, conditionally validated AI environment configuration.
Chat and embedding providers are independently selectable, local embeddings are model
swappable, and disabled/mock mode requires no paid provider credentials. The safe status
endpoint reports effective providers and capabilities without returning secrets.

Embedding-bearing records store provider, model, revision, dimensions, and optional
version metadata. A configuration mismatch marks existing ready records as
`NEEDS_REINDEX`; incompatible embeddings must never be compared.

## AI RAG maturity implementation

Phase 08 now includes provider execution, course indexing, file/text extraction,
overlapping chunking, embedding generation, tenant-scoped vector retrieval, local
boundary routing, canonical questions, context-safe answer caching, usage logging, and
the Learning Workspace AI Tutor panel.

The tutor enforces enrollment and assessment display policy before retrieval. It excludes
assessment and private learner data from the index, blocks cheating and explicit
off-topic requests before the main model, returns citations only for course-grounded
answers, and labels general educational fallback separately. Suggested follow-up
questions are clickable and do not require another generation call.

AI capabilities are delivered as organization-installable marketplace plugins.
Organization provider credentials are encrypted and isolated. Index, tutor, content
draft, question generation, and grading suggestion endpoints enforce plugin entitlement.
Generated questions remain drafts until instructor approval and publish. Grading output
remains suggestion-only until instructor submits normal manual grade.
