# Phase 08 AI Configuration Foundation

Implemented the environment and provider configuration layer for Phase 08:

- typed, centralized `AiConfig` with conditional validation
- disabled and mock defaults that require no external keys
- independent chat and embedding provider selection
- OpenAI, generic OpenAI-compatible, Gemini OpenAI-compatible, and local config
- provider capability factories without secret exposure
- model metadata and `NEEDS_REINDEX` mismatch handling
- safe `GET /api/v1/ai/status`

The maturity implementation now builds on this foundation with external chat execution,
lazy transformer embeddings, course indexing, scoped retrieval, cache and usage records,
and the learner tutor panel. See `docs/09-ai-rag.md` for the operational flow.
