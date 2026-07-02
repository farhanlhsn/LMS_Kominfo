

DEFINITION-OF-DONE.md
Kominfo AI Learning Management System
## Version 1.0
## Purpose
This document defines the minimum quality standard for every feature developed in this repository.
A feature is NOT considered complete until every applicable checklist item has been satisfied.
If any item fails, the feature remains In Progress.
General Definition of Done
Every feature must satisfy:
## Functional Requirements
UI Requirements
API Requirements
## Security Requirements
## Performance Requirements
## Accessibility Requirements
## Testing Requirements
## Documentation Requirements
## Functional Checklist
The feature must:
Match the PRD.
Match the API Contract.
Match the Resource Model.
Match the UI Specification.
Follow business rules.
Handle success cases.
Handle validation failures.
## •
## •
## •
## •
## •
## •
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

Handle permission failures.
Handle empty data.
Handle unexpected errors.
No undefined behavior is allowed.
UI Checklist
Every screen must have:
Responsive layout
Loading state
Empty state
Error state
Success feedback
Skeleton loading
Proper spacing
Consistent typography
Dark mode support
Mobile optimization
Every button must:
Display loading during requests
Prevent double click
Have disabled state
Show success/error feedback
UX Checklist
Navigation must:
Be intuitive
Require minimal clicks
Preserve scroll position
Support browser back button
Avoid unnecessary page refresh
Forms must:
Auto focus first field
Preserve entered values on validation errors
Display inline validation
Clearly indicate required fields
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## 2

Prevent accidental duplicate submissions
## Accessibility Checklist
Every page must:
Be keyboard navigable
Support screen readers
Have proper ARIA labels
Maintain visible focus indicators
Meet WCAG AA contrast requirements
Provide descriptive labels for icons
Include alt text for images
Respect reduced-motion preferences
Accessibility score target:
## = 95
## Performance Checklist
## Frontend
## Lighthouse Performance >= 95
Lazy load heavy components
Optimize images
Code splitting enabled
Prefetch important routes
Avoid unnecessary re-renders
## Backend
No N+1 queries
Pagination implemented
Database indexes verified
Efficient caching strategy
Response compression enabled
## AI
Streaming enabled
Token usage logged
Prompt size optimized
Retrieval limited to relevant context
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## 3

## Security Checklist
Every endpoint must:
Require authentication when needed
Enforce authorization
Validate all inputs
Sanitize user-generated content
Prevent XSS
Prevent SQL Injection
Prevent CSRF where applicable
Enforce rate limiting
Never expose secrets
Log security-sensitive actions
Uploads must:
Validate MIME type
Validate file extension
Validate file size
Store using signed URLs
Generate safe filenames
Reject executable files
API Checklist
Every endpoint must:
Follow REST conventions
Return standard response format
Return appropriate HTTP status codes
Validate request payloads
Validate query parameters
Validate path parameters
Include Swagger documentation
Support pagination where applicable
Error responses must be consistent.
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## 4

## Database Checklist
Before merging:
Prisma schema updated
Migration generated
Migration tested
Foreign keys verified
Cascade rules verified
Soft delete considered
Indexes reviewed
Seed data updated if required
No destructive migration without approval.
AI Checklist
Every AI feature must:
Use AI Gateway
Use approved prompts
Use RAG when knowledge-based
Return source citations
Log token usage
Respect rate limits
Reject prompt injection attempts
Avoid hallucinations
Provide graceful fallback when context is unavailable
## Logging Checklist
## Log:
## Login
## Logout
Course creation
Course update
Lesson completion
Quiz submission
Assignment submission
Certificate issuance
AI interactions
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## 5

Admin actions
Logs must not contain sensitive information.
## Analytics Checklist
Track events for:
Course enrollment
Lesson started
Lesson completed
Quiz started
Quiz completed
Assignment uploaded
Certificate downloaded
AI chat
Search performed
Events must include:
## Timestamp
User ID
## Region
Course ID (if applicable)
## Notification Checklist
If a feature affects users, verify:
Notification created
Notification displayed
Notification marked as read
Notification archived if applicable
## Testing Checklist
## Unit Tests
## Services
## Utilities
## Validation
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## 6

## Integration Tests
API endpoints
Database operations
## Authentication
## Authorization
E2E Tests
Critical learning flow
Quiz submission
Assignment submission
AI chat
Certificate generation
## Coverage Targets
## Overall >= 80%
Core modules >= 90%
## Documentation Checklist
Every feature must include:
Updated API documentation
## Updated Swagger
Updated README (if applicable)
Updated architecture docs if behavior changes
JSDoc for exported functions
Migration notes (if schema changes)
## Code Quality Checklist
Must pass:
TypeScript strict mode
ESLint
## Prettier
## Build
Unit tests
Integration tests
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## 7

## No:
any
commented-out code
unused imports
unused variables
duplicate logic
dead code
## Git Checklist
Every Pull Request must:
## Use Conventional Commits
Reference related issue/task
Pass CI/CD
Include description of changes
Include screenshots for UI changes
Include migration notes if database changed
Feature-Specific Acceptance
## Course
Course can be created, edited, published, archived.
Enrollment works correctly.
Progress updates correctly.
## Lesson
Lesson content renders correctly.
Video resumes playback.
Completion is tracked.
## Quiz
Questions randomize correctly.
Score is calculated correctly.
Passing rules enforced.
Retry logic respected.
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## 8

## Assignment
Upload succeeds.
Validation enforced.
Instructor grading works.
Feedback visible to student.
## Certificate
Generated only after completion.
QR code verifies correctly.
PDF downloads successfully.
AI Assistant
Answers only from retrieved context.
Sources displayed.
Streaming works.
Graceful fallback when no context exists.
Token usage recorded.
## Release Checklist
Before production deployment:
All automated tests pass
No critical security findings
Performance targets achieved
Database backup verified
Environment variables configured
Monitoring enabled
Error tracking enabled
Rollback plan prepared
## Merge Gate
A Pull Request may be merged only when:
All checklist items pass
CI/CD succeeds
Required reviews completed
Documentation updated
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## 9

No critical bugs remain
## Final Rule
If there is uncertainty about business logic, data structure, API behavior, or UI behavior:
Do not implement based on assumptions.
Stop implementation and request clarification.
Correctness is always preferred over speed.
## •
## 10