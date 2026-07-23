# Phase 08 AI RAG Implementation

Phase 08 provides a usable AI Tutor and RAG pipeline while retaining a no-key default.

Implemented:

- mock and OpenAI-compatible chat/embedding execution
- lazy local Hugging Face transformer embeddings
- rich text, transcript, TXT, Markdown, PDF, and DOCX extraction
- overlapping chunks with embedding model metadata
- organization, enrollment, course, lesson, activity, and publication-scoped retrieval
- local cheating/off-topic rules and optional embedding classification
- course citations and clearly labeled general educational fallback
- canonical question normalization, context hashing, and expiring answer cache
- clickable follow-up suggestions without extra provider calls
- assessment AI policy enforcement, usage logs, and per-user/per-org rate limits
- disabled, empty, loading, error, blocked, and answer states in Learning Workspace
- automatic deduplicated reindex after activity content or transcript changes
- Course Builder index readiness polling and generation lock while indexing
- strict course-question quality validation with one provider repair attempt

Instructor indexing endpoints are permission protected. Learner tutor requests require an
active organization membership and enrollment. Reindex after changing embedding models.
