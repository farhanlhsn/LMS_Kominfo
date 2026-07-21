# Advanced Learning Workspace

The LMS must provide a Coursera-style advanced learning workspace. The learning experience must not be a simple static lesson page.

## Goals

- Support side-by-side learning.
- Support multi-panel learning.
- Support pop-out windows for dual-monitor workflows.
- Support picture-in-picture video.
- Support transcript, notes, AI, discussion, quiz, code editor, and 3D preview panels.
- Keep progress, notes, AI context, and completion working across all layout modes.

## Layout modes

- standard
- side_by_side
- focus
- theatre
- split_video_transcript
- split_content_notes
- split_content_ai
- coding
- dual_window
- popout_panel
- picture_in_picture_video

## Components

- LearningWorkspace
- LearningTopbar
- CurriculumSidebar
- ActivityMainPanel
- LearningRightPanel
- ResizablePanelGroup
- TranscriptPanel
- NotesPanel
- AiTutorPanel
- DiscussionPanel
- ResourcesPanel
- FlashcardPanel
- PopoutWindowShell
- VideoTranscriptSync
- KeyboardShortcutProvider
- FocusModeToggle
- TheatreModeToggle
- DualScreenModeToggle

## Data model

LearningWorkspacePreference:

- id
- userId
- organizationId nullable
- defaultLayoutMode
- sidebarCollapsed
- rightPanelDefault
- preferredVideoMode
- enablePopout
- enableKeyboardShortcuts
- metadata JSON

LessonWorkspaceState:

- id
- userId
- organizationId
- courseId
- lessonId
- activityId nullable
- layoutMode
- sidebarWidth
- mainPanelWidth
- rightPanelWidth
- activeRightPanel
- popoutPanels JSON
- lastVideoTimeSeconds nullable
- metadata JSON

LearnerNote:

- id
- organizationId
- userId
- courseId
- lessonId nullable
- activityId nullable
- timestampSeconds nullable
- selectedText nullable
- content
- visibility: PRIVATE, INSTRUCTOR_VISIBLE, SHARED
- tags JSON

TranscriptSegment:

- id
- organizationId
- courseId
- lessonId
- activityId
- startTimeSeconds
- endTimeSeconds
- text
- language

## Required APIs

- `GET /api/v1/learn/workspace/preferences`
- `PATCH /api/v1/learn/workspace/preferences`
- `GET /api/v1/learn/lessons/:lessonId/workspace-state`
- `PATCH /api/v1/learn/lessons/:lessonId/workspace-state`
- `GET /api/v1/learn/lessons/:lessonId/notes`
- `POST /api/v1/learn/lessons/:lessonId/notes`
- `PATCH /api/v1/learn/notes/:noteId`
- `DELETE /api/v1/learn/notes/:noteId`
- `GET /api/v1/learn/activities/:activityId/transcript`
- `POST /api/v1/instructor/activities/:activityId/transcript`
- `PATCH /api/v1/instructor/transcripts/:transcriptId`
- `POST /api/v1/learn/workspace/popout-session`
- `GET /api/v1/learn/workspace/popout-session/:id`

## Pop-out and dual-monitor strategy

Browsers cannot force windows onto a monitor. Implement pop-out windows so learners can drag them to a second monitor.

Use:

- BroadcastChannel API for same-browser window synchronization
- localStorage event fallback
- WebSocket/SSE only when server-side realtime sync is needed
- backend persistence for final learning state

## AI context

AI panel must receive active course, module, lesson, activity, video timestamp, selected transcript, selected material text, and learner notes only when explicitly included by learner.

Suggested prompts:

- Explain this part
- Summarize this lesson
- Make practice questions
- Explain from this timestamp
- Turn my notes into flashcards
- Give me examples

## Plugin integration

Activity plugins may declare:

- supportedWorkspaceLayouts
- custom panels
- allowed placements: main, right, bottom, popout
- allowedInPopout
- requiredPermissions
- defaultVisible

## Assessment display policy

Quizzes/exams can disable workspace features:

- allowPopout
- allowDualWindow
- allowAIAssistant
- allowNotes
- allowTranscript
- requireFocusMode
- detectTabSwitch

## Acceptance criteria

- Learner can switch between standard, side-by-side, focus, and theatre modes.
- Learner can open transcript, notes, AI assistant, and discussion in side panel.
- Learner can pop out supported panels into a separate window.
- Pop-out windows remain synchronized with active course, lesson, activity, and video timestamp.
- Layout preference is persisted.
- Video transcript sync works.
- Timestamp notes work.
- Plugin activities can declare custom workspace panels.
