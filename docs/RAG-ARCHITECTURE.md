

RAG-ARCHITECTURE.md
Kominfo AI Learning Management System
## Version 1.0
## Overview
The AI Assistant is not a general-purpose chatbot.
Its primary role is to become a learning companion that answers questions strictly based on learning
materials available in the LMS.
The assistant must:
Answer only from uploaded learning materials.
Cite learning sources.
Minimize hallucinations.
Support Indonesian language first.
Support future multilingual expansion.
High-Level Architecture
## Instructor
## │
## Upload Material
## │
## ┌───────────────────┴────────────────────┐
## │                                        │
## Metadata Extraction                 File Storage
## │                                        │
## •
## •
## •
## •
## •
## 1

## Text Extraction                     Cloudflare R2
## │
## Cleaning
## │
## Chunking
## │
## Embedding
## │
PostgreSQL + pgvector
## │
## ──────────────────────────────────────────────────────
## Student Question
## │
## Query Processing
## │
## Embedding Query
## │
## Semantic Search
## │
Retrieve Top-K
## │
## Rerank Context
## │
## Prompt Construction
## 2

## │
OpenAI GPT
## │
## Streaming Response
## │
## Source Attribution
## │
## Chat Interface
AI Capabilities
The assistant provides:
## Question Answering
## Lesson Explanation
## Simplification
## Summarization
## Quiz Generation
## Essay Feedback
## Learning Recommendation
It does NOT:
Answer unrelated questions.
Provide legal advice.
Provide medical advice.
Fabricate learning content.
## Knowledge Sources
Supported sources:
Markdown lesson
Rich text lesson
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

## PDF
PowerPoint
## DOCX
Video transcript
Instructor notes
## Future:
## SCORM
## H5P
Discussion forum
Webinar transcript
## Document Ingestion Pipeline
## Upload
## ↓
## Virus Scan
## ↓
## Metadata Extraction
## ↓
OCR (if needed)
## ↓
## Text Extraction
## ↓
## Cleaning
## ↓
## Normalization
## ↓
## Chunking
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

## ↓
## Embedding
## ↓
## Store Vector
## ↓
Ready for Retrieval
## Text Extraction
Supported formats
## PDF
## DOCX
## PPTX
## Markdown
## HTML
## TXT
## Video Transcript
Image OCR (future)
## Cleaning Pipeline
## Normalize:
whitespace
line breaks
unicode
bullet lists
tables
## •
## •
## •
## •
## •
## 5

headers
## Remove:
duplicate spaces
empty pages
repeated headers
repeated footers
page numbers
## Preserve:
headings
tables
code blocks
lists
## Chunking Strategy
## Chunk Type
## Semantic Chunking
## Preferred Size
800–1200 tokens
## Overlap
150 tokens
## Rules
Never split:
heading
table
list
code block
Chunks should preserve context.
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

## Metadata
Each chunk stores:
## Chunk
id
courseId
moduleId
lessonId
pageNumber
heading
chunkIndex
content
tokenCount
language
createdAt
## Embedding Model
## Provider
OpenAI
## Model
text-embedding-3-small
## Future
text-embedding-3-large
## 7

## Embedding Dimensions
Provider default.
## Vector Database
## Primary
PostgreSQL
## Extension
pgvector
## Index
IVFFlat
## Future
## HNSW
## Migration Path
## Pinecone
## Weaviate
## Qdrant
## Retrieval Pipeline
## Student Question
## ↓
## Query Embedding
## ↓
## Similarity Search
## 8

## ↓
## Top 20 Chunks
## ↓
## Metadata Filter
## ↓
## Cross Encoder Rerank
## ↓
## Top 5 Context
## ↓
## Prompt Builder
## ↓
## GPT
## ↓
## Citation
## Filtering
Apply before retrieval.
## Filters
## Course
## Module
## Lesson
## Language
## Region
## 9

## Published Only
## Reranking
## Preferred
## Cross Encoder
## Fallback
## Cosine Similarity
Top-K
## Retrieve
## 20
## Return
## 5
## Prompt Assembly
## System Prompt
## +
## Retrieved Context
## +
## Conversation History
## +
## User Question
## ↓
## LLM
## 10

Never inject the entire database.
Use retrieved chunks only.
## Citation Rules
Every answer must cite:
## Course
## ↓
## Module
## ↓
## Lesson
## ↓
Page (if available)
## Example
## Source:
## Digital Literacy
## Module 2
## Lesson 4
## Page 12
Multiple citations supported.
## Conversation Memory
## Store
## User Question
## 11

## Assistant Answer
## Sources
## Token Usage
## Feedback
## Memory Window
10 turns
Long-term memory
## Disabled.
AI Safety Rules
## Reject:
## Prompt Injection
## System Prompt Extraction
## Jailbreak
SQL Generation
## Sensitive Internal Data
Never expose:
API Key
## Prompt
## Embedding
## Internal Metadata
## 12

## Guardrails
Always answer:
Based on learning materials.
If information is unavailable:
"I couldn't find this information in the available learning materials."
Do not guess.
AI Response Format
## {
## "answer":"...",
## "summary":"...",
## "sources":[
## {
## "course":"...",
## "module":"...",
## "lesson":"...",
## "page":12
## }
## ],
## "confidence":0.93
## }
## Streaming
Use streaming responses.
Do not wait for full completion.
Display citations after generation.
## 13

AI Features
AI Tutor
## Input
## Question
## Output
## Answer
## Sources
## Confidence
AI Summary
## Input
## Lesson
## Output
## Bullet Summary
## Key Points
AI Quiz Generator
## Input
## Lesson
## Output
## Questions
## Choices
## Answer
## 14

## Explanation
## Difficulty
AI Essay Review
## Input
## Essay
## Rubric
## Output
## Suggested Score
## Feedback
## Strengths
## Weaknesses
AI Recommendation
## Input
## Learning History
## Quiz Score
## Progress
## Output
## Recommended Lesson
## Recommended Review
## Recommended Quiz
## 15

## Prompt Versioning
Every prompt must have:
Prompt ID
## Version
## Author
## Created Date
## Last Modified
Prompt versions must be auditable.
AI Observability
## Track
## Latency
## Token Usage
## Cost
## Failure Rate
## Retrieved Chunks
## Rerank Score
## Hallucination Reports
## User Feedback
## Evaluation Metrics
## Answer Accuracy
## Citation Accuracy
## 16

## Retrieval Recall
## Response Time
## Token Cost
## User Satisfaction
## Hallucination Rate
## Performance Targets
## First Token
< 2 seconds
## Average Response
< 8 seconds
## Retrieval
< 300 ms
## Embedding
## Background Process
## Cost Optimization
Use GPT-4o-mini by default.
Escalate to GPT-4.1 only for:
## Essay Review
## Quiz Generation
## Long Summary
Cache embeddings.
Cache repeated retrieval results.
## •
## •
## •
## 17

Reuse conversation context efficiently.
## Future Enhancements
## Hybrid Search
## Knowledge Graph
Multi-Agent Routing
## Voice Tutor
## Vision Understanding
## Adaptive Learning
## Personalized Prompting
Offline AI
Instructor AI Copilot
## 18