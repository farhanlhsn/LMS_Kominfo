

AGENTS.md
Kominfo AI Learning Management System
This document defines the mandatory development rules for all AI coding agents working on this
repository.
These instructions override default assumptions whenever possible.
## Project Goal
Build a production-ready AI-powered Learning Management System.
## Priority:
## Maintainability
## Readability
## Scalability
## Performance
## Security
Do NOT optimize for writing the fewest lines of code.
Always optimize for long-term maintainability.
## General Rules
## Always:
Use TypeScript strict mode.
Prefer composition over inheritance.
Keep files small.
Write readable code.
Use descriptive naming.
Avoid duplication.
Prefer reusable components.
Prefer pure functions.
Keep business logic inside services.
## 1.
## 2.
## 3.
## 4.
## 5.
## •
## •
## •
## •
## •
## •
## •
## •
## •
## 1

## Never:
Use any.
Disable ESLint.
Ignore TypeScript errors.
Hardcode secrets.
Write business logic inside controllers.
Create circular dependencies.
## Architecture
Use Feature-Based Architecture.
## Example
apps/
web/
api/
packages/
ui/
utils/
types/
config/
features/
course/
quiz/
ai/
assignment/
analytics/
notification/
Do not organize code by file type.
Organize by business feature.
## •
## •
## •
## •
## •
## •
## 2

## Frontend Rules
## Framework
## Next.js App Router
## UI
Shadcn UI
## Styling
TailwindCSS
## Icons
## Lucide
## Forms
## React Hook Form
## Validation
## Zod
## State
TanStack Query
## Animation
## Framer Motion
## Rules
Use Server Components whenever possible.
Use Client Components only when required.
Do not fetch data inside Client Components unless necessary.
Prefer Server Actions only for simple mutations.
## •
## •
## •
## •
## •
## •
## •
## •
## 3

## Backend Rules
## Framework
NestJS
## Architecture
## Controller
## ↓
## Service
## ↓
## Repository
## ↓
## Database
Controllers must:
Validate input
Authorize request
Call service only
Business logic belongs inside services.
Repositories only access database.
## Database Rules
## ORM
## Prisma
Never write raw SQL unless performance requires it.
Always use migrations.
Every table must include:
## •
## •
## •
## 4

id
createdAt
updatedAt
Soft delete preferred.
API Rules
## REST API
JSON only
Use consistent response.
## {
## "success":true,
## "message":"",
## "data":{}
## }
Never expose internal errors.
## Authentication
## JWT
## Refresh Token
## Role Based Access Control
## Roles
## Student
## Instructor
## Regional Admin
## Super Admin
Never trust client roles.
Always validate permissions.
## •
## •
## •
## •
## 5

AI Rules
AI requests must pass through AI Gateway.
Never call OpenAI directly from UI.
Never expose API keys.
Always use streaming.
Always log token usage.
Always include source citations.
AI must answer ONLY from retrieved context.
No hallucination.
RAG Rules
## Pipeline
## Upload
## ↓
## Extract
## ↓
## Chunk
## ↓
## Embedding
## ↓
## Vector Search
## ↓
## 6

## Prompt
## ↓
## LLM
## ↓
## Citation
Chunk size
800–1200 tokens
## Overlap
150 tokens
## Top K
## 5
Always rerank.
## Security
Validate every input.
Escape HTML.
## Sanitize Markdown.
Rate limit AI endpoints.
Use signed upload URLs.
Never trust uploaded filenames.
## Logging
Every important action should create an Activity Log.
## 7

## Examples
## Login
## Course Created
## Lesson Updated
## Quiz Submitted
## Assignment Uploaded
## Certificate Generated
AI Chat
## Analytics
Track events only.
Do not calculate analytics from transactional tables.
## Examples
lesson_completed
quiz_started
quiz_completed
assignment_uploaded
certificate_generated
ai_chat
## Error Handling
Never swallow errors.
Use custom exceptions.
## 8

Return meaningful error messages.
Log stack trace internally.
## File Upload
Maximum size
## 100 MB
## Allowed
## PDF
## DOCX
## PPTX
## ZIP
## PNG
## JPG
## WEBP
## MP4
Store files in Cloudflare R2.
## Code Style
## Naming
camelCase
PascalCase
## SCREAMING_SNAKE_CASE
No abbreviations.
## 9

## Good
courseProgress
## Bad
cp
## Git
## Branch
feature/...
fix/...
refactor/...
## Commit
## Conventional Commits
## Examples
feat:
fix:
refactor:
docs:
test:
## Testing
Every service should have tests.
## Target
80% coverage.
## 10

Critical modules
## 90%.
## Performance
Lazy load pages.
Virtualize long lists.
Optimize images.
Use cache.
Stream AI responses.
Avoid N+1 query.
## Documentation
Every exported function must have JSDoc.
Every API endpoint must have Swagger.
Complex algorithms require explanation.
## Before Creating New Code
Always check:
Does similar functionality already exist?
Can this component be reused?
Does this follow project architecture?
Is it type-safe?
Is it testable?
## 1.
## 2.
## 3.
## 4.
## 5.
## 11

AI Agent Workflow
Before implementing a feature:
Read PRD.
## Read System Design.
## Read Resource Model.
Read API Contract.
Read related feature folder.
Never skip documentation.
Definition of Done
A feature is complete only if:
✓ UI implemented
✓ API implemented
✓ Validation added
✓ Permission checked
✓ Database migrated
✓ Tests passed
✓ Documentation updated
✓ Loading state
✓ Error state
✓ Empty state
## ✓ Responsive
## ✓ Accessible
✓ Dark mode compatible
## 1.
## 2.
## 3.
## 4.
## 5.
## 12

✓ No TypeScript errors
✓ No ESLint errors
✓ No duplicated logic
## Important
Do not invent APIs.
Do not invent database fields.
Do not invent business rules.
If documentation is missing, stop implementation and request clarification instead of making assumptions.
## 13