

UI-COMPONENTS.md
Kominfo AI Learning Management System
## Version 1.0
## Design Principles
Every UI must be:
## Consistent
## Reusable
## Accessible
## Responsive
## Themeable
## Composable
Never duplicate components.
Always reuse existing components.
## Component Categories
## Layout
## Navigation
## Feedback
## Display
## Course
## Lesson
## Quiz
## Assignment
## Certificate
## •
## •
## •
## •
## •
## •
## 1

## Dashboard
## Analytics
## AI
## Forms
## Data Display
## Utility
## Layout Components
AppShell
## Purpose
Main application wrapper.
## Contains
## Sidebar
## Topbar
## Main Content
## Notification Center
## Props
children
sidebar
header
footer?
## •
## •
## •
## •
## 2

## Sidebar
## Features
## Collapse
## Expand
## Nested Menu
## Active Route
## Badge Count
## Supports
## Student
## Instructor
## Admin
## Topbar
## Contains
## Search
## Notification
## Theme Toggle
## User Menu
## Region Selector
PageHeader
## Contains
## Title
## Description
## Breadcrumb
## Action Buttons
## Example
<PageHeader
title="Courses"
description="Manage all learning courses."
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

actions={<Button/>}
## />
## Section
Reusable page section.
## Props
title
description
children
## Navigation Components
## Breadcrumb
Auto generated.
## Command Palette
## Shortcut
## CTRL + K
## Search
## Courses
## Lessons
## Users
## Settings
## 4

## Navigation
## Region Switcher
## Purpose
Switch active region.
## Displays
## Aceh
## Medan
## Lampung
## Bengkulu
## Future
## Multi Region
## Feedback Components
EmptyState
## Props
title
description
image
action
ErrorState
## Displays
## Error Icon
## Retry Button
## •
## •
## •
## •
## •
## •
## 5

## Description
LoadingSkeleton
Never use spinner-only loading.
LoadingOverlay
Used during mutations.
SuccessBanner
Temporary success notification.
## Course Components
CourseCard
## Displays
## Thumbnail
## Title
## Category
## Difficulty
## Instructor
## Duration
## Progress
## Rating
## Actions
## View
## Continue
## Bookmark
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

CourseGrid
Responsive grid.
## Desktop
4 columns
## Tablet
2 columns
## Mobile
1 column
CourseProgress
Circular progress.
## Displays
## 65%
CourseBadge
## Displays
## Beginner
## Intermediate
## Advanced
EnrollmentButton
## States
## Enroll
## 7

## Continue
## Completed
## Locked
## Lesson Components
LessonSidebar
## Displays
## Module
## Lesson
## Progress
## Completion
LessonContent
## Render
## Markdown
## Video
## PDF
## Link
## Quiz
## Assignment
Automatically based on lesson type.
## 8

VideoPlayer
## Features
## Resume Position
## Subtitle
## Playback Speed
## Transcript
## Fullscreen
Picture in Picture
PDFViewer
## Features
## Zoom
## Search
## Download
## Thumbnail Navigation
LessonNavigation
## Buttons
## Previous
## Next
## Complete
NotesPanel
Student notes.
## 9

Auto save.
AI Components
AIChatPanel
Main AI interface.
## Contains
## Chat
## Prompt Suggestions
## Citation
## History
AIMessage
## Supports
## User
## Assistant
## System
## Markdown
## Code Block
## Citation
## Tables
SuggestedPrompt
## Examples
## 10

Explain easier
## Summarize
Give examples
Create quiz
## Translate
CitationCard
## Displays
## Lesson
## Module
## Page
## Reference
AIUsageBadge
## Displays
## Daily Remaining Tokens
## Quiz Components
QuizCard
## Displays
## Title
## Question Count
## Passing Score
## 11

## Duration
QuestionRenderer
Automatically render
## MCQ
## Essay
## True False
## Multiple Select
## Matching
ChoiceOption
## Supports
## Keyboard
## Mouse
## Touch
QuizProgress
## Displays
## Current Question
## Progress Bar
QuizTimer
Countdown timer.
## 12

QuizNavigator
Jump between questions.
ResultSummary
## Displays
## Score
## Correct
## Wrong
XP Earned
## Retry
## Assignment Components
AssignmentCard
## Displays
## Deadline
## Status
## Submission
FileUploader
## Supports
## Drag Drop
## Click Upload
## Progress
## 13

## Retry
## Preview
## Validation
SubmissionTimeline
## Shows
## Submitted
## Reviewed
## Revised
## Completed
RubricViewer
Display grading rubric.
## Certificate Components
CertificateCard
## Displays
## Certificate Number
## Issue Date
QR Code
## Buttons
## Download
## Verify
## 14

## Share
CertificatePreview
PDF Preview.
## Dashboard Components
StatsCard
## Displays
## Number
## Title
## Trend
## Icon
ProgressRing
Animated circular progress.
RecentActivity
Timeline component.
ContinueLearningCard
Resume learning.
RecommendedCourseCard
AI recommendation.
## 15

LearningHeatmap
Daily learning activity.
## Leaderboard Components
LeaderboardTable
## Columns
## Rank
## User
## XP
## Score
## Region
RankBadge
## Top
## 1
## 2
## 3
Special styling.
XPBadge
Displays XP.
## 16

## Analytics Components
LineChart
BarChart
DonutChart
## Heatmap
MetricCard
Displays KPI.
## Form Components
RichTextEditor
## Toolbar
## Image
## Link
## Table
## Markdown
TagInput
## Autocomplete.
## 17

SelectSearch
Searchable select.
DatePicker
MultiSelect
ImageUploader
## Crop
## Compress
## Preview
VideoUploader
## Progress
## Thumbnail
## Resume Upload
## Table Components
DataTable
## Supports
## Sorting
## Filtering
## Pagination
## 18

## Column Visibility
## Export
## Bulk Action
ActionMenu
Three-dot dropdown.
StatusBadge
## Colors
## Draft
## Published
## Archived
## Completed
## Pending
## Rejected
## Notification Components
NotificationBell
Unread count.
NotificationList
Grouped by date.
## 19

## Settings Components
ThemeSwitcher
## Supports
## Light
## Dark
## System
LanguageSelector
Future multilingual.
## Utility Components
ConfirmDialog
DeleteDialog
ShareDialog
CopyButton
## Tooltip
## Avatar
## 20

## Pagination
SearchInput
## Debounced.
FilterPanel
## Collapsible.
## Component Rules
Every reusable component must:
Be fully typed with TypeScript.
Support dark mode.
Be responsive.
Include loading state.
Include empty state where applicable.
Include error state where applicable.
Be keyboard accessible.
Use semantic HTML.
Expose only necessary props.
Avoid inline business logic.
## Styling Rules
Tailwind CSS only.
Use Shadcn UI primitives whenever possible.
Use class-variance-authority (CVA) for component variants.
Use tailwind-merge to merge class names.
Icons must use Lucide React.
Animation uses Framer Motion only when it improves UX.
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
## 21

## Naming Convention
PascalCase
CourseCard
LessonSidebar
AIChatPanel
LeaderboardTable
AssignmentCard
Never create duplicate components with different names.
Before creating a new component, search the project for an existing reusable one.
## Component Folder Structure
components/
## │
├── ui/                # shadcn primitives
├── layout/
├── navigation/
├── feedback/
├── dashboard/
├── course/
├── lesson/
├── quiz/
├── assignment/
├── certificate/
├── ai/
├── analytics/
├── forms/
├── tables/
├── notification/
└── shared/
## 22

## Design Tokens
## Spacing
xs = 4px
sm = 8px
md = 16px
lg = 24px
xl = 32px
## 2xl = 48px
## Border Radius
sm = 6px
md = 10px
lg = 14px
xl = 20px
full = 9999px
## Typography
## Heading 1
## Heading 2
## Heading 3
## Body Large
## Body
## Caption
## Label
## Future Components
DiscussionThread
LiveClassCard
WebinarPlayer
AIAvatar
VoiceRecorder
AIWhiteboard
CollaborativeEditor
## •
## •
## •
## •
## •
## •
## •
## 23

OrganizationSwitcher
SCORMPlayer
## •
## •
## 24