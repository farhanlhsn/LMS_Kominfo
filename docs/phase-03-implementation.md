# Phase 03 Implementation Notes

Phase 03 adds the file, video, rich content, and content library foundation while keeping the platform generic, multi-tenant, and plugin-ready.

## Backend

- Added storage provider abstraction with MinIO/S3-compatible implementation.
- Added organization-scoped files and folders with signed URL access.
- Added content library items for rich text, video, file, PDF, link, and image content.
- Extended activity content with structured content, text extraction placeholder fields, external URLs, file references, and processing metadata.
- Added content processing queue service with content-processing and AI-indexing queue names. Full AI RAG remains deferred.
- Added learner content and video progress endpoints.

## Database

- Added `File`, `Folder`, and `ContentLibraryItem`.
- Added storage, visibility, file access, purpose, processing, and content-library item enums.
- Extended `ActivityContent` with `content`, `textContent`, `fileId`, `externalUrl`, and `metadata`.

## Frontend

- Added reusable content/file components for upload, picker, cards, previews, content library grid/table, rich text editor/viewer, video player, PDF placeholder, activity content renderer, processing status, and upload progress.
- Added instructor File Manager and Content Library pages.
- Updated the learning activity renderer to use Phase 03 content renderers.

## Security

- File APIs require organization context and RBAC.
- File reads are tenant-scoped and go through the file access policy.
- Learner activity content access requires enrollment or public course access.
- Signed URLs are generated server-side only.
- File validation blocks unsupported MIME types and oversized uploads.

## Deferred

- Full video transcoding/HLS pipeline.
- Full AI RAG indexing and retrieval.
- Quiz, assignment, certificate, payment, plugin execution, and enterprise SSO features.
