# AI and RAG Architecture

## Principles

- AI tutor for courses must answer based on course material.
- If relevant context is not found, AI must say the information is not available in the course material.
- AI generated content for instructors must be saved as draft and require review/approval.
- AI provider must be replaceable.

## Providers

LlmProvider:

- generateText
- generateJson
- streamText optional

EmbeddingProvider:

- embedText
- embedBatch

RetrieverService:

- retrieveCourseContext
- retrieveLessonContext
- retrieveActivityContext

## Data model

AiDocument:

- organizationId
- courseId nullable
- lessonId nullable
- activityId nullable
- fileId nullable
- title
- sourceType
- rawText
- status
- metadata

AiChunk:

- organizationId
- documentId
- courseId nullable
- lessonId nullable
- activityId nullable
- chunkIndex
- content
- tokenCount
- embedding
- metadata

AiConversation:

- organizationId
- userId
- courseId nullable
- lessonId nullable
- type: LEARNER_TUTOR, INSTRUCTOR_ASSISTANT, ADMIN_ASSISTANT

AiMessage:

- conversationId
- role
- content
- sources JSON nullable

AiGeneratedItem:

- organizationId
- courseId nullable
- lessonId nullable
- activityId nullable
- createdById
- type: QUESTION, QUIZ, SUMMARY, FLASHCARD, ASSIGNMENT, RUBRIC, COURSE_OUTLINE, LESSON_CONTENT
- prompt
- output JSON
- status: DRAFT, APPROVED, REJECTED, PUBLISHED

## AI features

Learner:

- Ask AI Tutor
- Ask current lesson
- Summarize lesson
- Explain simpler
- Generate practice questions
- Generate flashcards
- Explain selected transcript

Instructor:

- Generate quiz draft
- Generate question options
- Generate explanation
- Generate lesson outline
- Generate assignment
- Generate rubric
- Generate summary
- Improve content
- Translate content
- AI grading assistant

Admin:

- AI usage dashboard
- AI quota
- AI settings per organization

## Required safety

- Rate limit AI usage.
- Track token usage and cost.
- Store sources used in answers.
- Do not expose system prompts.
- Mark AI generated content.
- Require instructor approval for AI generated quiz/question content.

## Environment and provider configuration

AI configuration is parsed once into the typed `AiConfig` object. Feature services and
provider factories must consume that object rather than reading environment variables.
The default local setup is deliberately free and offline-safe:

```env
AI_ENABLED=false
AI_CHAT_PROVIDER=mock
AI_EMBEDDING_PROVIDER=mock
```

External credentials are validated only for the provider selected while AI is enabled.
API keys are never returned by the AI status endpoint and prompt logging is disabled by
default.

### Gemini chat with local embeddings

```env
AI_ENABLED=true
AI_CHAT_PROVIDER=gemini_openai_compatible
GEMINI_API_KEY=your_key
GEMINI_OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
GEMINI_CHAT_MODEL=gemini-2.5-flash

AI_EMBEDDING_PROVIDER=local
AI_LOCAL_EMBEDDING_PROVIDER=transformers_js
AI_LOCAL_EMBEDDING_MODEL=intfloat/multilingual-e5-small
AI_LOCAL_EMBEDDING_DIMENSIONS=384
```

### Official OpenAI

```env
AI_ENABLED=true
AI_CHAT_PROVIDER=openai
AI_EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your_key
OPENAI_CHAT_MODEL=your-chat-model
OPENAI_EMBEDDING_MODEL=your-embedding-model
```

### Generic OpenAI-compatible provider

```env
AI_ENABLED=true
AI_CHAT_PROVIDER=openai_compatible
OPENAI_COMPATIBLE_API_KEY=your_key
OPENAI_COMPATIBLE_BASE_URL=https://example.com/v1
OPENAI_COMPATIBLE_CHAT_MODEL=your-model
```

### Swapping the local embedding model

Update the local model, revision, and dimensions in the environment, restart the API,
then inspect authenticated `GET /api/v1/ai/status` using the active organization context.
Stored chunks, canonical questions, and classifier
prototypes carry their provider/model/revision/dimension/version metadata. Incompatible
records are marked `NEEDS_REINDEX` and are not eligible for vector comparison. Reindex
them before tuning canonical, domain, and off-topic similarity thresholds.

The `transformers_js` provider loads the configured Hugging Face model lazily and runs
embeddings through ONNX. Provider failures degrade to an unavailable tutor response
without bypassing authorization or tenant checks.

## Implemented RAG flow

Instructor indexing is available through:

- `POST /api/v1/instructor/courses/:courseId/ai/index`
- `GET /api/v1/instructor/courses/:courseId/ai/index/status`

Activity rich text, supported attached files (plain text, Markdown, PDF, DOCX), and
transcripts are extracted into `AiDocument` records. Text is chunked with overlap,
embedded through the selected embedding provider, and stored with full model metadata.
Activity content and transcript changes trigger reindexing automatically.

Learners ask questions through `POST /api/v1/learn/ai/tutor`. Retrieval always starts
with active organization, enrollment, published course, published lesson, and published
non-assessment activity filters. Cosine ranking occurs only after those database filters.
Quiz content, assignment content, submissions, correct answers, and private notes are
not part of the index. Learner notes enter a prompt only when their own note IDs are
explicitly included.

The routing sequence is:

1. enforce enrollment and `assessmentDisplayPolicy.allowAIAssistant`
2. reject assessment-answer and explicit off-topic requests using local rules
3. retrieve permitted course chunks
4. use offline embedding classification when rules do not decide
5. answer from course context, use allowed general educational fallback, or refuse

Course answers return citations. General educational answers are labeled and carry no
course citations. Follow-up suggestions are generated without an additional model call.
Canonical questions and a context hash key the answer cache, preventing reuse across
different organizations, courses, activities, or retrieved context.

Usage records store route, source type, provider/model, cache hit, token estimates,
duration, and status. Prompts remain excluded unless `AI_LOG_PROMPTS=true` is explicitly
configured. The default disabled mode returns a safe disabled response and never calls
an external provider.
