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
