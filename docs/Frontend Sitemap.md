

FRONTEND-SITEMAP.md
Kominfo AI Learning Management System
## Version 1.0
## Design Principles
## Mobile First
## Desktop Optimized
## Responsive
Accessible (WCAG AA)
Clean Government UI
AI First Experience
## Route Structure
## /
├── login
├── register
├── forgot-password
├── dashboard
├── courses
│   ├── [courseSlug]
│   │   ├── overview
│   │   ├── curriculum
│   │   ├── discussion (future)
│   │   ├── leaderboard
│   │   └── certificate
├── learn
│   └── [lessonId]
├── quiz
│   └── [quizId]
## •
## •
## •
## •
## •
## •
## 1

├── assignment
│   └── [assignmentId]
├── ai
├── leaderboard
├── certificates
├── profile
├── settings
├── notifications
├── admin
│   ├── dashboard
│   ├── users
│   ├── regions
│   ├── instructors
│   ├── courses
│   ├── modules
│   ├── lessons
│   ├── quizzes
│   ├── assignments
│   ├── certificates
│   ├── analytics
│   ├── ai
│   └── settings
## 2

## Layout Structure
## Public Layout
Used by:
## Login
## Register
## Forgot Password
## Components
## Minimal Navbar
## Logo
## Footer
## Student Layout
## Sidebar
## Topbar
## Content
AI Floating Button
## Notification Center
## Admin Layout
## Sidebar
## Top Navigation
## Breadcrumb
## Content
## Global Search
## Notification
## •
## •
## •
## •
## •
## •
## 3

## Profile Menu
## Public Pages
## Landing Page
## Route
## /
## Sections
## Hero
## Features
## How It Works
AI Assistant
## Popular Courses
## Statistics
## Testimonials
## FAQ
## Footer
## CTA
## Login
/ login
## Features
## 4

## Email Login
## Google Login
## Forgot Password
## Remember Me
## Register
## /register
## Fields
## Name
## Email
## Password
## Region
## Role (optional)
## Student Area
## Dashboard
## /dashboard
## Widgets
## Continue Learning
## Course Progress
## Upcoming Assignment
## 5

## Learning Hours
## Leaderboard Preview
## Recommended Courses
AI Recommendation
## Recent Activity
## Notifications
## Quick Actions
## Course Catalog
## /courses
## Features
## Search
## Filter
## Category
## Difficulty
## Region
## Instructor
## Sort
Grid/List
## Pagination
## 6

## Course Detail
## /courses/[slug]
## Sections
## Course Header
## Instructor
## Description
## Curriculum
## Requirements
## Target Audience
## Rating
## Enroll Button
## Leaderboard
## Related Courses
## Curriculum Tab
## Displays
## Module List
## Lesson Count
## Estimated Time
## Completion Status
## 7

## Learn Page
/learn/[lessonId]
## Layout
## Left
## Lesson Navigation
## Center
## Lesson Content
## Right
AI Assistant
## Notes
## Resources
## Bottom
## Next Lesson
## Previous Lesson
## Mark Complete
## Supported Lesson Types
## Markdown
## Video
## PDF
## External Link
## Quiz
## Assignment
## 8

AI Panel
Always available during learning.
## Features
## Ask Question
## Summarize
## Explain Simpler
## Generate Practice Quiz
## Translate
## Copy Answer
## Citation
## Quiz
## /quiz/[id]
## Sections
## Question
## Choices
## Progress
## Timer
## Navigation
## Submit
## Review
## 9

## Quiz Result
## Displays
## Score
## Correct Answers
## Wrong Answers
## Explanation
## Retry Button
## Leaderboard
## Assignment
## /assignment/[id]
## Displays
## Instruction
## Due Date
## Rubric
## Upload Area
## Submission Status
## Feedback
## Certificates
## /certificates
## List
## 10

## Issued Date
## Course
## Download
## Share
## Verify
## Leaderboard
## /leaderboard
## Tabs
## Global
## Regional
## Course
## Displays
## Rank
## XP
## Score
## Streak
## Notifications
## /notifications
## Grouped
## Unread
## Today
## 11

## This Week
## Older
## Profile
## /profile
## Tabs
## Overview
## Learning History
## Achievements
## Certificates
## Settings
## Settings
## /settings
## Tabs
## Account
## Security
## Appearance
## Notifications
## Language
## Accessibility
## 12

## Admin Area
## Admin Dashboard
## Widgets
## Users
## Courses
## Revenue (future)
## Completion Rate
## Quiz Accuracy
## Learning Hours
## Regional Comparison
AI Usage
## User Management
## Features
## Search
## Filter
## Create
## Edit
## Deactivate
## Reset Password
## Assign Role
## 13

## Region Management
## Displays
## Branding
## Participants
## Courses
## Leaderboard
## Analytics
## Course Management
## Features
## Draft
## Publish
## Archive
## Clone
## Bulk Action
## Course Editor
## Tabs
## General
## Thumbnail
## Curriculum
## Settings
## SEO
## 14

## Publish
## Module Editor
## Create
## Update
## Delete
## Reorder
## Lesson Editor
## Lesson Types
## Markdown
## Video
## PDF
## Link
## Quiz
## Assignment
## Features
## Rich Text Editor
## Video Upload
PDF Upload
## Preview
## Publish
## 15

## Quiz Builder
## Features
## Question Bank
## Drag & Drop
## Randomization
## Passing Score
## Timer
## Preview
## Assignment Builder
## Features
## Instruction Editor
## Rubric
## Attachment
## Deadline
## Allowed File Type
## Certificate Builder
## Features
## Template
## Background
## QR
## Signature
## 16

## Preview
## Analytics
## Tabs
## Overview
## Courses
## Users
## Regions
## AI
## Quiz
## Assignment
AI Management
## Displays
## Prompt Templates
## Embedding Status
## Token Usage
## Top Questions
## Knowledge Base
## System Settings
## Tabs
## General
## Authentication
## 17

## AI
## Email
## Storage
## Security
## Branding
## Feature Flags
## Navigation
## Student Sidebar
## Dashboard
## Courses
## Certificates
## Leaderboard
AI Assistant
## Notifications
## Profile
## Settings
## Admin Sidebar
## Dashboard
## Users
## Regions
## Courses
## 18

## Lessons
## Quiz
## Assignments
## Certificates
## Analytics
## AI
## Settings
## Global Components
Available on every page
## Search
## Notifications
## Theme Switch
## Profile Menu
## Help
## Breadcrumb
## Loading Bar
Command Palette (Ctrl+K)
## Empty States
Every page must include
## Illustration
## Title
## 19

## Description
## CTA
## Error States
Every page must include
## Retry Button
## Helpful Message
## Support Link
## Loading States
Use Skeleton UI
Never use Spinner-only loading
## Responsive Behavior
## Desktop
Sidebar expanded
## Tablet
Collapsible sidebar
## Mobile
## Bottom Navigation
Floating AI Button
## Hamburger Menu
## 20

## Accessibility
## Keyboard Navigation
## Screen Reader Support
## Focus Indicator
## High Contrast Mode
## Reduced Motion
ARIA Labels
## Future Pages
## Discussion Forum
## Live Classroom
## Webinar
## Survey
## Community
## Marketplace
## Organization Management
Government SSO
AI Learning Path
AI Mentor Dashboard
## 21