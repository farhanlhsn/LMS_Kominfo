export type CourseStatus =
  | "DRAFT"
  | "SUBMITTED_FOR_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export type CourseLevel =
  "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";

export type ActivityTypeKey =
  | "core.text"
  | "core.video"
  | "core.file"
  | "core.link"
  | "core.quiz"
  | "core.assignment"
  | string;

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  level: CourseLevel;
  status: CourseStatus;
  visibility: string;
  durationMinutes: number;
  learningObjectives?: unknown;
  requirements?: unknown;
  targetAudience?: unknown;
  tags?: unknown;
  autoCertificate?: boolean;
  autoCertificateTemplateId?: string | null;
  isPaid?: boolean | null;
  price?: number | null;
  currency?: string | null;
  category?: Category | null;
  instructors?: Array<{ user?: { name?: string | null; email?: string } }>;
  modules?: CourseModule[];
  _count?: {
    enrollments?: number;
    modules?: number;
    lessons?: number;
    activities?: number;
  };
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  isPublished: boolean;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  courseId: string;
  moduleId?: string;
  title: string;
  slug?: string;
  summary?: string | null;
  orderIndex: number;
  isPublished?: boolean;
  isPreview?: boolean;
  estimatedMinutes: number;
  activities: Activity[];
  course?: Course;
}

export interface Activity {
  id: string;
  courseId: string;
  lessonId: string;
  title: string;
  description?: string | null;
  activityTypeKey: ActivityTypeKey;
  pluginKey?: string | null;
  pluginVersion?: string | null;
  orderIndex: number;
  isRequired: boolean;
  isPublished: boolean;
  estimatedMinutes: number;
  config?: Record<string, unknown>;
  content?: Record<string, unknown>;
  completionRule?: Record<string, unknown>;
  gradingRule?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  activityContent?: ActivityContent | null;
  progress?: ActivityProgress[];
}

export interface StudySession {
  id: string;
  organizationId: string;
  userId: string;
  courseId?: string | null;
  goalId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  targetSeconds?: number | null;
  elapsedSeconds: number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

export interface ActivityProgress {
  id: string;
  activityId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  progressPercent: number;
  startedAt?: string | null;
  completedAt?: string | null;
  lastAccessedAt?: string | null;
}

export interface ActivityContent {
  id: string;
  activityId: string;
  body?: Record<string, unknown>;
  content?: Record<string, unknown>;
  textContent?: string | null;
  externalUrl?: string | null;
  resources?: unknown[];
  fileId?: string | null;
  metadata?: Record<string, unknown>;
  file?: FileAsset | null;
}

export interface ActivityContentResponse {
  activity: {
    id: string;
    title: string;
    activityTypeKey: ActivityTypeKey;
    completionRule?: unknown;
  };
  plugin?: {
    key: string;
    name?: string;
    version?: string | null;
    enabled: boolean;
    available: boolean;
    placeholder?: boolean;
    reason?: "enabled" | "disabled" | "missing" | "placeholder";
  };
  content: ActivityContent | null;
  fileAccess: { url: string; expiresInSeconds: number } | null;
}

export interface Enrollment {
  id: string;
  courseId: string;
  status: string;
  progressPercent: number;
  lastActivityId?: string | null;
  completedAt?: string | null;
  lastAccessedAt?: string | null;
  course: Course;
}

export interface CourseProgress {
  progressPercent: number;
  completedRequired: number;
  requiredTotal: number;
}

export interface LearningCourseResponse {
  enrollment: Enrollment;
  curriculum: Course;
  progress: CourseProgress;
}

export interface FileAsset {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  size: number;
  visibility: string;
  accessLevel: string;
  purpose: string;
  processingStatus: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  createdAt: string;
  updatedAt: string;
}

export interface ContentLibraryItem {
  id: string;
  title: string;
  description?: string | null;
  type: "RICH_TEXT" | "VIDEO" | "FILE" | "PDF" | "LINK" | "IMAGE" | "THREE_D_MODEL";
  tags?: string[];
  metadata?: Record<string, unknown>;
  fileId?: string | null;
  file?: FileAsset | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
  activeOrganization: {
    id: string;
    slug: string;
    name: string;
    memberId?: string;
    roleKeys?: string[];
    permissionKeys?: string[];
    isPlatformAdmin?: boolean;
  };
  organizations?: OrganizationSummary[];
}

export interface OrganizationSummary {
  id: string;
  slug: string;
  name: string;
  membershipStatus?: string;
}

export interface PermissionRecord {
  id?: string;
  key: string;
  description?: string | null;
}

export interface OrganizationRoleRecord {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: PermissionRecord[];
}

export interface OrganizationMemberRecord {
  id: string;
  status: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
  roles: string[];
}

export type PluginCategory =
  | "ACTIVITY"
  | "CONTENT"
  | "ASSESSMENT"
  | "AI_TOOL"
  | "INTEGRATION"
  | "PAYMENT_PROVIDER"
  | "NOTIFICATION_CHANNEL"
  | "STORAGE_PROVIDER"
  | "VIDEO_PROVIDER"
  | "PROCTORING_PROVIDER"
  | "ANALYTICS"
  | "CERTIFICATE_REQUIREMENT";

export type PluginStatus = "DRAFT" | "ACTIVE" | "DISABLED" | "DEPRECATED";

export interface PluginActivityType {
  key: string;
  name: string;
  description?: string;
  supportedWorkspaceLayouts?: string[];
  implemented?: boolean;
  pluginKey: string;
  pluginName: string;
  pluginVersion: string;
  category: PluginCategory;
  placeholder: boolean;
}

export interface Plugin {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  version: string;
  category: PluginCategory;
  status: PluginStatus;
  author?: string | null;
  manifest?: Record<string, unknown>;
  configSchema?: Record<string, unknown> | null;
  permissions?: string[] | null;
  capabilities?: string[] | null;
  enabled: boolean;
  organizationPlugin?: {
    id: string;
    enabled: boolean;
    config?: Record<string, unknown> | null;
    installedAt: string;
    updatedAt: string;
  } | null;
}

export interface PluginExecutionLog {
  id: string;
  organizationId: string;
  pluginId: string;
  userId?: string | null;
  action: string;
  status: "SUCCESS" | "FAILED";
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
  durationMs?: number | null;
  createdAt: string;
}

export type WorkspaceLayoutMode =
  | "standard"
  | "side_by_side"
  | "focus"
  | "theatre"
  | "split_video_transcript"
  | "split_content_notes"
  | "split_content_ai"
  | "dual_window"
  | "popout_panel"
  | "picture_in_picture_video";

export type WorkspacePanelMode =
  | "notes"
  | "transcript"
  | "resources"
  | "ai"
  | "discussion"
  | "flashcards"
  | "bookmarks"
  | "upcoming"
  | "activity_info";

export interface LearningWorkspacePreference {
  id: string;
  organizationId: string;
  userId: string;
  preferredLayout: WorkspaceLayoutMode;
  rightPanelMode?: WorkspacePanelMode | null;
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  playbackSpeed?: number | null;
  captionsEnabled: boolean;
  transcriptEnabled: boolean;
  notesPanelOpen: boolean;
  metadata?: Record<string, unknown>;
}

export interface LessonWorkspaceState {
  id?: string;
  organizationId?: string;
  userId?: string;
  courseId: string;
  lessonId?: string | null;
  activityId?: string | null;
  layout: WorkspaceLayoutMode;
  rightPanelMode?: WorkspacePanelMode | null;
  sidebarCollapsed?: boolean;
  rightPanelCollapsed?: boolean;
  lastVideoTimeSeconds?: number | null;
  metadata?: Record<string, unknown>;
}

export interface LearnerNote {
  id: string;
  organizationId: string;
  userId: string;
  courseId: string;
  lessonId?: string | null;
  activityId?: string | null;
  videoTimeSeconds?: number | null;
  selectedText?: string | null;
  content: string;
  visibility: "PRIVATE" | "INSTRUCTOR_VISIBLE" | "SHARED";
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerBookmark {
  id: string;
  organizationId: string;
  userId: string;
  courseId: string;
  lessonId?: string | null;
  activityId?: string | null;
  videoTimeSeconds?: number | null;
  title?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  course?: { id: string; title: string; slug: string };
  lesson?: { id: string; title: string } | null;
  activity?: { id: string; title: string } | null;
}

export interface TranscriptSegment {
  id: string;
  organizationId: string;
  courseId: string;
  lessonId?: string | null;
  activityId: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
  speaker?: string | null;
  language?: string | null;
  orderIndex: number;
  metadata?: Record<string, unknown>;
}

export interface VideoCaptionCue {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface VideoCaptionTrack {
  id: string;
  organizationId: string;
  courseId: string;
  lessonId?: string | null;
  activityId: string;
  label: string;
  language: string;
  kind: "CAPTION" | "SUBTITLE";
  source: "MANUAL" | "UPLOAD" | "TRANSCRIPT";
  isDefault: boolean;
  cues: VideoCaptionCue[];
  rawContent?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AssessmentDisplayPolicy {
  allowPopout: boolean;
  allowDualWindow: boolean;
  allowAIAssistant: boolean;
  allowNotes: boolean;
  allowTranscript: boolean;
  requireFocusMode: boolean;
  detectTabSwitch: boolean;
}

export interface WorkspaceContext {
  organizationId: string;
  course: { id: string; title: string; subtitle?: string | null };
  lesson: { id: string; title: string; summary?: string | null };
  activity: {
    id: string;
    title: string;
    activityTypeKey: string;
    pluginKey?: string | null;
  };
  progress?: ActivityProgress | null;
  availablePanels: WorkspacePanelMode[];
  assessmentDisplayPolicy: AssessmentDisplayPolicy;
  transcriptAvailable: boolean;
  captionLanguages: string[];
  defaultCaptionLanguage?: string | null;
  notesCount: number;
  bookmarksCount: number;
}

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "MULTIPLE_ANSWER"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "ESSAY"
  | "NUMERIC";

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  orderIndex: number;
  feedback?: string | null;
}

export interface Question {
  id: string;
  questionBankId: string;
  type: QuestionType;
  prompt: string;
  explanation?: string | null;
  points: number;
  acceptedAnswers?: string[];
  numericTolerance?: number | null;
  options: QuestionOption[];
  metadata?: Record<string, unknown> | null;
}

/** Optional image attached to the stem (file id in storage). */
export function questionImageFileId(
  q: { metadata?: Record<string, unknown> | null },
): string | null {
  const id = q.metadata?.imageFileId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export interface QuestionBank {
  id: string;
  title: string;
  description?: string | null;
  courseId?: string | null;
  _count?: { questions?: number };
}

/** Tags live in metadata.tags (string[]). */
export function questionTags(q: { metadata?: Record<string, unknown> | null }): string[] {
  const raw = q.metadata?.tags;
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
}

export interface QuizQuestion {
  id: string;
  questionId: string;
  orderIndex: number;
  points?: number | null;
  question: Question;
}

export type QuizRandomPool = {
  bankId: string;
  count: number;
  type?: string;
};

export interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  courseId?: string | null;
  activityId?: string | null;
  passingScorePercent: number;
  attemptLimit: number;
  timeLimitMinutes?: number | null;
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
  showFeedback: boolean;
  metadata?: Record<string, unknown> | null;
  questions?: QuizQuestion[];
  randomPools?: QuizRandomPool[];
  _count?: { questions?: number; attempts?: number };
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  activityId?: string | null;
  userId: string;
  attemptNumber: number;
  status:
    "IN_PROGRESS" | "SUBMITTED" | "GRADED" | "NEEDS_MANUAL_GRADING" | "EXPIRED";
  startedAt: string;
  dueAt?: string | null;
  submittedAt?: string | null;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  user?: { email: string; name?: string | null };
  quiz?: { id: string; title: string } | null;
}

export interface QuizAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string | null;
  numericAnswer?: number | null;
  isCorrect?: boolean | null;
  pointsAwarded: number;
  maxPoints: number;
  status:
    | "NOT_GRADED"
    | "CORRECT"
    | "PARTIALLY_CORRECT"
    | "INCORRECT"
    | "NEEDS_MANUAL_GRADING";
  feedback?: string | null;
}

export type LearnerQuizQuestion = Question & { quizQuestionId?: string };

export interface LearnerQuizResponse {
  quiz: Omit<Quiz, "questions"> & { questions: LearnerQuizQuestion[] };
  lastAttempt?: (QuizAttempt & { answers?: QuizAnswer[] }) | null;
}

export interface QuizResult {
  attempt: QuizAttempt;
  quiz: Omit<Quiz, "questions"> & { questions: LearnerQuizQuestion[] };
  answers: QuizAnswer[];
}

export interface AiStatus {
  enabled: boolean;
  chatProvider: string;
  embeddingProvider: string;
  chatModel?: string | null;
  embeddingModel?: string | null;
  answerMode: string;
  routerMode: string;
  cacheEnabled: boolean;
  followupsEnabled: boolean;
  localClassifierEnabled: boolean;
  needsReindex: boolean;
  disabledReason?: string | null;
}

export interface AiCitation {
  id: string;
  chunkId: string;
  title: string;
  sourceType: string;
  lessonId?: string | null;
  activityId?: string | null;
  excerpt: string;
  score: number;
}

export interface AiTutorResponse {
  conversationId: string;
  messageId: string;
  answer: string;
  sourceType:
    | "COURSE_MATERIAL"
    | "GENERAL_EDUCATIONAL"
    | "BLOCKED"
    | "OUT_OF_SCOPE"
    | "DISABLED";
  sourceLabel: string;
  citations: AiCitation[];
  suggestions: string[];
  cacheHit: boolean;
  disabled: boolean;
}

export interface AiGeneratedItem {
  id: string;
  organizationId: string;
  courseId?: string | null;
  lessonId?: string | null;
  activityId?: string | null;
  createdById: string;
  type:
    | "QUESTION"
    | "QUIZ"
    | "SUMMARY"
    | "FLASHCARD"
    | "ASSIGNMENT"
    | "RUBRIC"
    | "COURSE_OUTLINE"
    | "LESSON_CONTENT";
  title?: string | null;
  prompt: string;
  output: Record<string, unknown>;
  status: "DRAFT" | "APPROVED" | "REJECTED" | "PUBLISHED";
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RubricLevel {
  id: string;
  title: string;
  description?: string | null;
  points: number;
  orderIndex: number;
}

// Phase 18: Advanced assignment (group, peer review, plagiarism, portfolio, showcase)

export type AssignmentCollaborationMode = "INDIVIDUAL" | "GROUP";

export type PeerReviewStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "EXPIRED"
  | "DECLINED";

export type PlagiarismCheckStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface AssignmentGroupMember {
  id: string;
  organizationId: string;
  groupId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface AssignmentGroup {
  id: string;
  organizationId: string;
  assignmentId: string;
  courseId: string;
  name: string;
  maxMembers: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  members?: AssignmentGroupMember[];
  _count?: { submissions: number };
}

export interface PeerReviewConfig {
  id: string;
  organizationId: string;
  assignmentId: string;
  reviewsRequired: number;
  reviewsToReceive: number;
  openFrom?: string | null;
  dueAt?: string | null;
  rubricId?: string | null;
  anonymize: boolean;
  allowSelfReview: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PeerReviewRubricScore {
  criterionId: string;
  levelId?: string;
  points: number;
  feedback?: string;
}

export interface PeerReviewMatch {
  id: string;
  organizationId: string;
  configId: string;
  submissionId: string;
  reviewerUserId: string;
  status: PeerReviewStatus;
  dueAt?: string | null;
  createdAt: string;
  updatedAt: string;
  submission?: {
    id: string;
    assignmentId?: string;
    textAnswer?: string | null;
    linkUrl?: string | null;
    fileIds?: unknown[];
    userId?: string;
    attemptNumber?: number;
  };
  reviewer?: { id: string; email: string; name: string };
  config?: { id: string; anonymize: boolean; assignmentId: string };
  review?: PeerReview | null;
}

export interface PeerReview {
  id: string;
  organizationId: string;
  matchId: string;
  authorId?: string | null;
  overallScore?: number | null;
  feedback?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  rubricScores?: PeerReviewRubricScore[];
}

export interface SubmissionAnnotation {
  id: string;
  organizationId: string;
  submissionId: string;
  authorId: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  comment: string;
  resolved: boolean;
  resolvedById?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; email: string; name: string };
  resolvedBy?: { id: string; email: string; name: string };
}

export interface PlagiarismMatchedSource {
  url?: string;
  title?: string;
  excerpt?: string;
  similarityPercent: number;
}

export interface PlagiarismCheck {
  id: string;
  organizationId: string;
  submissionId: string;
  requesterId?: string | null;
  provider: string;
  status: PlagiarismCheckStatus;
  similarityScore?: number | null;
  matchedSources?: PlagiarismMatchedSource[];
  reportUrl?: string | null;
  details?: Record<string, unknown>;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface ProjectShowcase {
  id: string;
  organizationId: string;
  courseId: string;
  submissionId: string;
  createdById: string;
  title: string;
  summary?: string | null;
  thumbnailUrl?: string | null;
  externalUrl?: string | null;
  publishedAt?: string | null;
  featured: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  submission?: {
    id: string;
    assignment?: { id: string; title: string };
  };
  createdBy?: { id: string; email: string; name: string };
}

export interface PortfolioEntry {
  id: string;
  organizationId: string;
  portfolioId: string;
  submissionId?: string | null;
  showcaseId?: string | null;
  title: string;
  description?: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  submission?: { id: string; assignmentId: string } | null;
  showcase?: ProjectShowcase | null;
}

export interface Portfolio {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
  shareToken?: string | null;
  createdAt: string;
  updatedAt: string;
  entries: PortfolioEntry[];
  user?: { id: string; email: string; name: string };
}

export interface RubricCriterion {
  id: string;
  title: string;
  description?: string | null;
  maxPoints: number;
  orderIndex: number;
  levels?: RubricLevel[];
}

export interface Rubric {
  id: string;
  title: string;
  description?: string | null;
  courseId?: string | null;
  totalPoints: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  criteria?: RubricCriterion[];
}

export interface Assignment {
  id: string;
  courseId: string;
  activityId?: string | null;
  title: string;
  description?: string | null;
  instructions?: string | null;
  submissionType: "TEXT" | "FILE" | "LINK" | "TEXT_AND_FILE" | "PROJECT";
  dueAt?: string | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  allowLateSubmission: boolean;
  latePenaltyPercent?: number | null;
  maxAttempts?: number | null;
  allowResubmission: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  rubric?: Rubric | null;
  _count?: { submissions?: number };
  collaborationMode?: AssignmentCollaborationMode;
  groupMinMembers?: number;
  groupMaxMembers?: number;
  maxResubmissions?: number;
}

export interface RubricScore {
  id: string;
  criterionId: string;
  levelId?: string | null;
  points: number;
  feedback?: string | null;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  courseId: string;
  activityId?: string | null;
  userId: string;
  attemptNumber: number;
  status:
    "DRAFT" | "SUBMITTED" | "LATE" | "GRADED" | "RETURNED" | "RESUBMITTED";
  textAnswer?: string | null;
  linkUrl?: string | null;
  fileIds?: string[];
  submittedAt?: string | null;
  gradedAt?: string | null;
  score?: number | null;
  maxScore?: number | null;
  feedback?: string | null;
  assignment?: Assignment;
  rubricScores?: RubricScore[];
  user?: { email: string; name?: string | null };
}

export interface LearnerAssignmentResponse {
  assignment: Assignment;
  latestSubmission?: AssignmentSubmission | null;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  description?: string | null;
  design?: Record<string, unknown>;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
}

export interface Certificate {
  id: string;
  courseId: string;
  userId: string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  revokeReason?: string | null;
  pdfFileId?: string | null;
  pdfStatus: "PENDING" | "GENERATING" | "GENERATED" | "FAILED";
  pdfGeneratedAt?: string | null;
  pdfError?: string | null;
  course?: Course;
  user?: { id: string; name?: string | null; email?: string };
  template?: CertificateTemplate | null;
}

export interface CertificateVerification {
  id: string;
  certificateNumber: string;
  verificationCode: string;
  status: "VALID" | "REVOKED" | "EXPIRED";
  issuedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  learnerName?: string | null;
  courseTitle: string;
  organizationName: string;
  templateName?: string | null;
}

export interface LearningGoal {
  id: string;
  courseId?: string | null;
  title: string;
  description?: string | null;
  targetType:
    | "COURSE_COMPLETION"
    | "ACTIVITY_COMPLETION"
    | "STUDY_TIME"
    | "SCORE"
    | "CUSTOM";
  targetValue?: Record<string, unknown>;
  progressValue?: Record<string, unknown>;
  dueAt?: string | null;
  status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
  completedAt?: string | null;
  course?: Course | null;
}

export interface DiscussionReply {
  id: string;
  threadId: string;
  parentReplyId?: string | null;
  authorId: string;
  body: string;
  status: "VISIBLE" | "HIDDEN" | "DELETED";
  createdAt: string;
  author?: { id: string; name?: string | null };
}

export interface DiscussionThread {
  id: string;
  courseId: string;
  lessonId?: string | null;
  activityId?: string | null;
  authorId: string;
  title: string;
  body: string;
  status: "VISIBLE" | "HIDDEN" | "DELETED";
  pinned: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name?: string | null };
  replies?: DiscussionReply[];
  _count?: { replies: number };
}

export interface DiscussionReport {
  id: string;
  reason: string;
  details?: string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  reporter?: { id: string; name?: string | null };
  thread?: { id: string; title: string; courseId: string; status: string } | null;
  reply?: { id: string; body: string; status: string; thread: { id: string; title: string; courseId: string } } | null;
}

export interface LiveClass {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  provider: "MANUAL_LINK" | "ZOOM" | "GOOGLE_MEET" | "CUSTOM";
  meetingUrl?: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  course?: { id: string; title: string };
}

export interface InAppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  inAppEnabled: boolean;
  emailEnabled?: boolean | null;
  mutedTypes: string[];
}

export interface CalendarEvent {
  organizationId: string;
  courseId?: string | null;
  title: string;
  description?: string | null;
  type: string;
  startsAt: string;
  endsAt?: string | null;
  timezone?: string | null;
  sourceType: string;
  sourceId: string;
  visibility: string;
  actionUrl?: string | null;
  metadata?: { courseTitle?: string; status?: string; editable?: boolean };
}

export interface LearnerDashboard {
  totalCourses: number;
  activeEnrollments: number;
  completedCourses: number;
  avgProgressPercent: number;
  monthlyActivityEvents: number;
}

export interface LearnerStreak {
  currentStreak: number;
  longestStreak: number;
  todayActive: boolean;
  dailyActivity: Array<{ date: string; eventCount: number; activityMinutes: number }>;
}

export interface LearnerGrades {
  courses: LearnerCourseGrade[];
  overallGpa: number | null;
}

export interface LearnerCourseGrade {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  overallGrade: number | null;
  quizAverage: number | null;
  assignmentAverage: number | null;
  totalWeighted: number | null;
  totalMaxWeight: number | null;
  quizzes: LearnerQuizGrade[];
  assignments: LearnerAssignmentGrade[];
}

export interface LearnerQuizGrade {
  activityId: string;
  quizTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  attemptedAt: string;
}

export interface LearnerAssignmentGrade {
  activityId: string;
  assignmentTitle: string;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  status: string;
  submittedAt: string | null;
  gradedAt: string | null;
}

export interface LearnerCourseProgress {
  enrollment: Record<string, unknown> | null;
  activityProgress: ActivityProgress[];
  recentEvents: Record<string, unknown>[];
  totalActivities: number;
  completedActivities: number;
}

export interface InstructorDashboard {
  courses: InstructorCourseMetric[];
  totalLearners: number;
  totalEnrollments: number;
  avgCompletionRate: number;
}

export interface InstructorCourseMetric {
  id: string;
  title: string;
  slug: string;
  enrollments: number;
  completedCount: number;
  completionRate: number;
  weeklyActivity: number;
}

export interface InstructorGradebookRow {
  studentId: string;
  student: { id: string; name?: string | null; email: string };
  enrollmentStatus: string;
  progressPercent: number;
  lastAccessedAt?: string | null;
  average: number | null;
  assignmentScores: Array<{
    assignmentId: string;
    title: string;
    score: number | null;
    maxScore: number | null;
    status: string;
  }>;
}

export interface InstructorRosterRow {
  id: string;
  status: string;
  progressPercent: number;
  lastAccessedAt?: string | null;
  enrolledAt: string;
  user: { id: string; name?: string | null; email: string };
}

export interface InstructorRosterResponse {
  data: InstructorRosterRow[];
  meta: ApiMeta;
}

export interface AdminOverview {
  totalCourses: number;
  activeMembers: number;
  totalEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
  monthlyEvents: number;
  recentAuditLogs: AuditLogEntry[];
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  severity: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  user?: { id: string; name: string | null; email: string } | null;
}

export interface DailyTrend {
  date: string;
  events: number;
  enrollments?: number;
}

export interface CourseMetric {
  id: string;
  title: string;
  slug: string;
  status: string;
  createdAt: string;
  enrollments: number;
}

// ── Phase 11 — Learning Path & Gamification ──────────

export interface LearningPath {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  difficulty: string | null;
  durationHours: number;
  enrolledCount: number;
  createdAt: string;
  courses?: LearningPathCourse[];
  _count?: { courses: number; enrollments: number };
}

export interface LearningPathCourse {
  id: string;
  courseId: string;
  orderIndex: number;
  required: boolean;
  course: { id: string; title: string; slug: string; thumbnailUrl?: string | null; level?: string };
}

export interface LearningPathEnrollment {
  id: string;
  learningPathId: string;
  userId: string;
  status: string;
  progressPercent: number;
  learningPath?: LearningPath;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  _count?: { courseSkills: number };
}

export interface CourseSkill {
  id: string;
  courseId: string;
  skillId: string;
  weight: number;
  skill: Skill;
}

export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  proficiency: number;
  skill: Skill;
}

export interface XpTransaction {
  id: string;
  amount: number;
  reason: string;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalXp: number;
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  xpReward: number;
  _count?: { users: number };
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  earnedAt: string;
  achievement: Achievement;
}

// ── Phase 12 — Payment & Marketplace ────────────────

export interface OrderItem {
  id: string;
  courseId: string;
  price: number;
  currency: string;
  course: { id: string; title: string; slug: string };
}

export interface Order {
  id: string;
  organizationId: string;
  userId: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  currency: string;
  couponId: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  items: OrderItem[];
  payments?: Payment[];
  _count?: { payments: number };
  user?: { id: string; name: string | null; email: string };
}

export interface Payment {
  id: string;
  organizationId: string;
  orderId: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  proofImageUrl: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  paidAt: string | null;
  confirmedById: string | null;
  notes: string | null;
  createdAt: string;
  order?: Order;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountPercent: number;
  discountAmount: number | null;
  maxUses: number | null;
  currentUses: number;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  intervalCount: number;
  courseAccess: string;
  maxEnrollments: number | null;
  isActive: boolean;
}

export interface UserSubscription {
  id: string;
  planId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  plan: SubscriptionPlan;
}

// ── Phase 13 — Enterprise SSO, API Keys, Webhooks ────

export interface Branding {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  borderRadius: string;
  name: string;
  slug: string;
}

export interface SsoProvider {
  id: string;
  type: string;
  name: string;
  issuer: string;
  enabled: boolean;
  callbackUrl: string;
  _count?: { identities: number; domains: number };
}

export interface LoginPolicy {
  id: string;
  allowPasswordLogin: boolean;
  allowSocialLogin: boolean;
  allowSsoLogin: boolean;
  requireSsoForVerifiedDomains: boolean;
  jitProvisioningEnabled: boolean;
  inviteOnly: boolean;
  mfaRequired: boolean;
  sessionTtlMinutes: number;
}

export interface OrgDomain {
  id: string;
  domain: string;
  verificationStatus: string;
  verifiedAt: string | null;
  enforceSso: boolean;
  autoJoinEnabled: boolean;
  ssoProvider?: { id: string; name: string } | null;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  rawKey?: string;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: string;
  description: string | null;
  _count?: { deliveries: number };
}

export interface WebhookDelivery {
  id: string;
  eventType: string;
  status: string;
  responseStatus: number | null;
  attempts: number;
  createdAt: string;
}

// ── Phase 15 — Reviews, Wishlist, Favorites ─────────

export interface CourseReview {
  id: string;
  courseId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  createdAt: string;
  user?: { id: string; name: string | null };
  course?: { id: string; title: string; slug: string };
}

export interface WishlistItem {
  id: string;
  courseId: string;
  createdAt: string;
  course: { id: string; title: string; slug: string; thumbnailUrl?: string | null; level?: string };
}

export interface FavoriteInstructor {
  id: string;
  instructorId: string;
  instructor: { id: string; name: string | null; email: string };
}

export interface RecentlyViewedCourse {
  id: string;
  courseId: string;
  viewedAt: string;
  course: { id: string; title: string; slug: string; thumbnailUrl?: string | null; level?: string };
}

export interface NotesExport {
  markdown: string;
  count: number;
  format: string;
}

// Phase 16: Experiences (SCORM, H5P, xAPI, Survey, Poll, Feedback)

export interface ScormPackage {
  id: string;
  courseId: string;
  activityId?: string | null;
  title: string;
  version: string;
  manifest?: Record<string, unknown>;
  fileId?: string | null;
  entryUrl?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface ScormAttempt {
  id: string;
  packageId: string;
  userId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUSPENDED" | "COMPLETED";
  scoreRaw?: number | null;
  scoreMin?: number | null;
  scoreMax?: number | null;
  completion: "INCOMPLETE" | "COMPLETED" | "NOT_ATTEMPTED" | "UNKNOWN";
  success: "PASSED" | "FAILED" | "UNKNOWN";
  sessionId?: string | null;
  cmiData?: Record<string, unknown>;
  startedAt: string;
  finishedAt?: string | null;
  updatedAt: string;
}

export interface H5PContent {
  id: string;
  courseId: string;
  activityId?: string | null;
  library: string;
  title: string;
  params?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  fileId?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface H5PResult {
  id: string;
  contentId: string;
  userId: string;
  score?: number | null;
  maxScore?: number | null;
  completion: "INCOMPLETE" | "COMPLETED";
  success: "PASSED" | "FAILED" | "UNKNOWN";
  raw?: Record<string, unknown>;
  submittedAt: string;
}

export interface XapiStatement {
  id: string;
  actor: Record<string, unknown>;
  verb: Record<string, unknown>;
  object: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
  authority?: Record<string, unknown> | null;
  timestamp?: string | null;
  stored: string;
}

export interface XapiStateResponse {
  state: Record<string, unknown> | null;
}

export type SurveyQuestionType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "SINGLE_CHOICE"
  | "MULTI_CHOICE"
  | "RATING"
  | "SCALE"
  | "YES_NO";

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  type: SurveyQuestionType;
  prompt: string;
  helpText?: string | null;
  required: boolean;
  orderIndex: number;
  options: Array<{ id: string; label: string; value?: string }>;
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string } | null;
  createdAt: string;
}

export interface Survey {
  id: string;
  courseId?: string | null;
  activityId?: string | null;
  title: string;
  description?: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  anonymous: boolean;
  allowMultipleSubmissions: boolean;
  closesAt?: string | null;
  createdAt: string;
  updatedAt: string;
  questions?: SurveyQuestion[];
  _count?: { questions?: number; responses?: number };
}

export interface SurveyAnswerRecord {
  id: string;
  responseId: string;
  questionId: string;
  value: unknown;
  textValue?: string | null;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  userId?: string | null;
  submittedAt: string;
  metadata?: Record<string, unknown>;
  answers?: SurveyAnswerRecord[];
  user?: { id: string; name?: string | null; email: string } | null;
}

export interface SurveyWithQuestions extends Survey {
  questions: SurveyQuestion[];
}

export interface PollOption {
  id: string;
  label: string;
}

export interface Poll {
  id: string;
  courseId?: string | null;
  activityId?: string | null;
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  anonymous: boolean;
  closesAt?: string | null;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  _count?: { votes?: number };
}

export interface PollVote {
  id: string;
  pollId: string;
  userId?: string | null;
  selected: string[];
  votedAt: string;
}

export interface PollResults {
  poll: Poll;
  totalVotes: number;
  options: Array<{ id: string; label: string; votes: number }>;
}

export interface CourseFeedbackEntry {
  id: string;
  courseId: string;
  userId?: string | null;
  rating: number;
  comment?: string | null;
  metadata?: Record<string, unknown>;
  submittedAt: string;
  user?: { id: string; name?: string | null; email: string } | null;
}

export interface CourseFeedbackListResponse {
  data: CourseFeedbackEntry[];
  average: number;
  totalFeedback: number;
  meta: ApiMeta;
}

// ── Phase 21 — Data Governance & Backup ──────────────────────

export type LegalDocumentType =
  | "PRIVACY_POLICY"
  | "TERMS"
  | "COOKIE_POLICY"
  | "DPA";

export interface LegalDocument {
  id: string;
  organizationId: string;
  type: LegalDocumentType;
  version: string;
  title: string;
  content: string;
  effectiveAt: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  organizationId: string;
  documentId: string | null;
  documentType: LegalDocumentType;
  documentVersion: string;
  granted: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  grantedAt: string;
}

export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences?: boolean;
  sessionId: string;
}

export type DataExportStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface DataExportRequest {
  id: string;
  userId: string;
  organizationId: string;
  status: DataExportStatus;
  requestedAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AnonymizationRequest {
  id: string;
  userId: string;
  organizationId: string;
  status: string;
  requestedAt: string;
  completedAt: string | null;
  reason?: string | null;
}

export interface RetentionPolicy {
  id: string;
  organizationId: string;
  entityType: string;
  retentionDays: number;
  anonymize: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BackupJobType = "FULL" | "INCREMENTAL";
export type BackupJobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface BackupJob {
  id: string;
  organizationId: string;
  type: BackupJobType;
  status: BackupJobStatus;
  startedAt: string | null;
  completedAt: string | null;
  sizeBytes: string | null;
  location: string | null;
  notes?: string | null;
  triggeredBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Phase 22 — OAuth, Captcha, MFA ──────────────────────

export type OAuthProvider = "GOOGLE" | "MICROSOFT";

export interface OAuthAccount {
  id: string;
  userId: string;
  organizationId?: string | null;
  provider: OAuthProvider;
  providerUserId: string;
  email?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MfaFactorType = "TOTP" | "BACKUP_CODE";

export interface MfaFactor {
  id: string;
  userId: string;
  type: MfaFactorType;
  verifiedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MfaEnrollmentChallenge {
  id: string;
  type: MfaFactorType;
  secret?: string;
  otpauthUrl?: string;
  codes?: string[];
  verified: boolean;
}

export interface RefreshSessionEntry {
  id: string;
  userId: string;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface LoginAttempt {
  id: string;
  email: string;
  organizationId?: string | null;
  userId?: string | null;
  success: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  reason?: string | null;
  createdAt: string;
}

// ── Phase 26 — Moderation, Legal, Consent ──────────────────────

export type ModerationTargetType =
  | "CONTENT"
  | "USER"
  | "COMMENT"
  | "COURSE"
  | "DISCUSSION";

export type ModerationReportStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "RESOLVED"
  | "DISMISSED";

export type ModerationActionType =
  | "WARN"
  | "SUSPEND"
  | "BAN"
  | "REMOVE"
  | "RESTORE"
  | "LOCK";

export interface ModerationReport {
  id: string;
  organizationId: string;
  reporterId: string;
  targetType: ModerationTargetType;
  targetId: string;
  reason: string;
  description?: string | null;
  status: ModerationReportStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  resolution?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  reporter?: { id: string; name?: string | null; email: string };
  reviewedBy?: { id: string; name?: string | null; email: string };
}

export interface ModerationAction {
  id: string;
  organizationId: string;
  actorId: string;
  targetType: ModerationTargetType;
  targetId: string;
  actionType: ModerationActionType;
  reason: string;
  notes?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  actor?: { id: string; name?: string | null; email: string };
}

export interface ContentFlag {
  id: string;
  organizationId: string;
  flaggedById?: string | null;
  targetType: ModerationTargetType;
  targetId: string;
  flagType: string;
  autoDetected: boolean;
  confidence?: number | null;
  reason?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface LegalAcceptanceLog {
  id: string;
  userId: string;
  organizationId: string;
  documentType: LegalDocumentType;
  documentVersion: string;
  acceptedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// ── Phase 24 — Realtime Gateway ──────────────────────

export type RealtimeTransport = "polling" | "sse" | "websocket";

export interface RealtimeTransportInfo {
  preferred: RealtimeTransport;
  available: RealtimeTransport[];
}

export interface RealtimeEvent {
  id: string;
  organizationId: string;
  channel: string;
  type: string;
  payload: Record<string, unknown>;
  actorId?: string | null;
  createdAt: string;
}

export interface RealtimeSubscription {
  id: string;
  userId: string;
  channel: string;
  lastSeenAt: string;
}

export interface RealtimePollResult {
  data: RealtimeEvent[];
  meta: { count: number; transport: RealtimeTransport };
}

// ── Phase 25 — Bulk Operations ───────────────────────

export type BulkJobType =
  | "IMPORT"
  | "EXPORT"
  | "ARCHIVE"
  | "UNARCHIVE"
  | "ENROLL"
  | "UNENROLL"
  | "TAG"
  | "UNTAG";

export type BulkJobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "PARTIAL";

export type BulkJobItemStatus = "PENDING" | "PROCESSED" | "FAILED" | "SKIPPED";

export type BulkEntityType =
  | "course"
  | "user"
  | "enrollment"
  | "content"
  | "tag";

export interface BulkJobItem {
  id: string;
  jobId: string;
  entityType: BulkEntityType;
  entityId?: string | null;
  status: BulkJobItemStatus;
  error?: string | null;
  input?: Record<string, unknown>;
  processedAt?: string | null;
  createdAt: string;
}

export interface BulkJob {
  id: string;
  organizationId: string;
  type: BulkJobType;
  status: BulkJobStatus;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  progressTotal: number;
  progressDone: number;
  progressFailed: number;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  items?: BulkJobItem[];
}

export interface CreateBulkJobInput {
  type: BulkJobType;
  description?: string;
  items: Array<{
    entityType: BulkEntityType;
    entityId?: string;
    input?: Record<string, unknown>;
  }>;
}

export interface CreateBulkJobResult {
  job: BulkJob;
  items: Array<{ id: string; status: "ok" | "skipped" | "failed"; error?: string }>;
}

// ── Phase 27 — Direct Messaging ──────────────────────

export type ConversationType = "DIRECT" | "GROUP";
export type ConversationMemberRole = "MEMBER" | "ADMIN";

export interface ConversationMember {
  userId: string;
  role: ConversationMemberRole;
  lastReadAt?: string | null;
  user?: { id: string; name?: string | null; email: string };
}

export interface Conversation {
  id: string;
  organizationId: string;
  type: ConversationType;
  createdById: string;
  name?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  messages?: Array<{
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  }>;
}

export interface MessageAttachment {
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface MessageReadReceipt {
  id: string;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface ChatMessage {
  id: string;
  organizationId: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments: MessageAttachment[];
  parentMessageId?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  reactions?: MessageReaction[];
  reads?: MessageReadReceipt[];
}

export interface CreateConversationInput {
  type: ConversationType;
  name?: string;
  memberIds: string[];
}

export interface SendMessageInput {
  content: string;
  attachments?: MessageAttachment[];
  parentMessageId?: string;
}

// ── Phase 19 — Global Search ─────────────────────────

export type SearchEntityType =
  | "course"
  | "lesson"
  | "discussion"
  | "user"
  | "certificate"
  | "help_article";

export interface SearchHit {
  id: string;
  type: SearchEntityType;
  title: string;
  snippet: string;
  score: number;
  url: string;
  metadata: Record<string, unknown>;
}

export interface GlobalSearchResult {
  query: string;
  total: number;
  hits: SearchHit[];
  facetCounts: Record<SearchEntityType, number>;
}

export interface SearchAnalytics {
  windowDays: number;
  total: number;
  topQueries: Array<{ query: string; count: number }>;
  recent: Array<{
    id: string;
    query: string;
    types: unknown;
    resultsCount: number;
    createdAt: string;
  }>;
}

// ── Phase 20 — Localization and Help Center ─────────

export interface UserLocalePreference {
  id?: string;
  organizationId: string;
  userId: string;
  locale: string;
  timezone: string;
  fallbackChain: string[];
  metadata?: Record<string, unknown>;
}

export interface OrgLocalePreference {
  id?: string;
  organizationId: string;
  defaultLocale: string;
  supportedLocales: string[];
  fallbackChain: string[];
  metadata?: Record<string, unknown>;
}

export interface HelpCategory {
  id: string;
  organizationId: string;
  key: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  _count?: { articles: number };
}

export interface HelpArticle {
  id: string;
  organizationId: string;
  categoryId: string;
  slug: string;
  title: string;
  body: string;
  excerpt?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  tags: string[];
  viewCount: number;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; key: string; title: string };
}

export type SupportTicketStatus =
  | "OPEN"
  | "PENDING"
  | "RESOLVED"
  | "CLOSED"
  | "REJECTED";

export type SupportTicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface SupportTicket {
  id: string;
  organizationId: string;
  userId: string;
  subject: string;
  body: string;
  category: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedToId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  user?: { id: string; email: string; name?: string | null };
  assignedTo?: { id: string; email: string; name?: string | null };
  replies?: SupportTicketReply[];
  _count?: { replies: number };
}

export interface SupportTicketReply {
  id: string;
  organizationId: string;
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author?: { id: string; email: string; name?: string | null };
}

// ── Phase 35 — Transcript Notes AI Context ──────────

export type TranscriptNoteColor =
  | "yellow"
  | "green"
  | "blue"
  | "pink"
  | "purple";

export interface TranscriptNote {
  id: string;
  organizationId: string;
  userId: string;
  lessonId: string;
  activityId?: string | null;
  timestampSeconds: number;
  content: string;
  color: TranscriptNoteColor;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NoteContext {
  id: string;
  organizationId: string;
  noteId: string;
  aiContextSummary: string;
  relatedNotes: Array<{ id: string; relevance: number; reason: string }>;
  providerKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NoteExportResult {
  id: string;
  markdown: string;
  count: number;
  format: string;
}

// Phase 31: 3D Content Plugin types
export type ThreeDFormat = "GLB" | "GLTF" | "FBX" | "OBJ";

export interface ThreeDAssetRecord {
  id: string;
  organizationId: string;
  name: string;
  format: ThreeDFormat;
  sizeBytes: number;
  url: string;
  thumbnailUrl: string | null;
  uploadedBy: string;
  createdAt: string;
  uploader?: { id: string; name: string; email: string };
  _count?: { scenes: number };
  scenes?: ThreeDSceneRecord[];
}

export interface ThreeDSceneRecord {
  id: string;
  organizationId: string;
  assetId: string;
  scene: Record<string, unknown>;
  version: number;
  createdAt: string;
  interactions?: ThreeDInteractionRecord[];
  asset?: Pick<ThreeDAssetRecord, "id" | "name" | "format" | "url" | "thumbnailUrl">;
}

export interface ThreeDInteractionRecord {
  id: string;
  sceneId: string;
  name: string;
  trigger: string;
  action: Record<string, unknown>;
  createdAt: string;
}

// Phase 32: Code Runner Plugin types
export type CodeLanguage =
  | "PYTHON"
  | "JAVASCRIPT"
  | "TYPESCRIPT"
  | "GO"
  | "RUST"
  | "JAVA"
  | "CPP"
  | "RUBY"
  | "PHP";

export type CodeExecutionStatus =
  | "PENDING"
  | "COMPLETED"
  | "RUNNING"
  | "FAILED"
  | "TIMED_OUT"
  | "RUNTIME_ERROR"
  | "ERROR";

export interface CodeExecutionRecord {
  id: string;
  organizationId: string;
  userId: string;
  language: CodeLanguage;
  code: string;
  status: CodeExecutionStatus;
  output: string | null;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
  testCases?: CodeExecutionTestCaseRecord[];
}

export interface CodeExecutionTestCaseRecord {
  id: string;
  executionId: string;
  name: string;
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  passed: boolean;
}

export interface CodeSubmissionRecord {
  id: string;
  organizationId: string;
  assignmentId: string;
  userId: string;
  language: CodeLanguage;
  code: string;
  status: "SUBMITTED" | "PASSED" | "FAILED";
  score: number | null;
  feedback: string | null;
  createdAt: string;
}

export interface CodeJudgeResult {
  executionId: string;
  status: "PASSED" | "FAILED";
  score: number;
  results: Array<{
    id: string;
    name: string;
    passed: boolean;
    actualOutput: string;
    durationMs: number;
  }>;
}

// Phase 33: Plugin Marketplace Governance types
export type PluginListingStatus = "DRAFT" | "PUBLISHED" | "SUSPENDED" | "ARCHIVED";
export type PluginInstallationStatus = "ACTIVE" | "DISABLED";
export type PluginReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PluginListingRecord {
  id: string;
  pluginId: string;
  organizationId: string;
  name: string;
  description: string;
  longDescription: string | null;
  categories: string[];
  screenshots: string[];
  pricing: Record<string, unknown>;
  status: PluginListingStatus;
  submittedAt: string | null;
  publishedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { reviews: number; installations: number };
  reviews?: PluginReviewRecord[];
  installations?: PluginInstallationRecord[];
}

export interface PluginReviewRecord {
  id: string;
  organizationId: string;
  listingId: string;
  reviewerId: string;
  rating: number;
  comment: string | null;
  status: PluginReviewStatus;
  createdAt: string;
  reviewer?: { id: string; name: string; email: string };
  listing?: { id: string; name: string };
}

export interface PluginInstallationRecord {
  id: string;
  organizationId: string;
  listingId: string;
  installedAt: string;
  config: Record<string, unknown>;
  status: PluginInstallationStatus;
  listing?: { id: string; name: string; pluginId: string; status: PluginListingStatus };
}

export interface PluginPolicyRecord {
  id: string;
  organizationId: string;
  maxInstalls: number;
  allowedCategories: string[];
  requireApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

// Phase 34: Popout Dual Monitor types
export interface PopoutSessionResponse {
  token: string;
  expiresAt: string;
  lessonId: string;
}

export interface PopoutValidationResponse {
  lessonId: string;
  organizationId: string;
  userId: string;
  expiresAt: string;
}

// Phase 36: Plugin Workspace Panels types
export type PanelSize = "sm" | "md" | "lg";
export type PanelPosition = "left" | "right" | "top" | "bottom";

export interface PluginPanelDefinition {
  id: string;
  organizationId: string;
  pluginId: string;
  panelKey: string;
  name: string;
  defaultSize: PanelSize;
  defaultPosition: PanelPosition;
  allowedRoutes: string[];
  configSchema: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PanelEntry {
  panelKey: string;
  size?: PanelSize;
  position?: PanelPosition;
  visible?: boolean;
}

export interface UserPanelLayoutRecord {
  layoutKey: string;
  panels: PanelEntry[];
  updatedAt: string | null;
}

// ── Phase 23: Cohorts, Schedules & Timezones ──────────────────────

export type CohortStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type CohortMemberStatus = "ACTIVE" | "WITHDRAWN" | "COMPLETED";

export interface Cohort {
  id: string;
  organizationId: string;
  name: string;
  courseId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  maxSeats: number;
  status: CohortStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  members?: CohortMember[];
  schedule?: CohortSchedule[];
  course?: { id: string; title: string; slug: string };
  _count?: { members: number; schedule: number };
}

export interface CohortMember {
  id: string;
  organizationId: string;
  cohortId: string;
  userId: string;
  status: CohortMemberStatus;
  joinedAt: string;
  user?: { id: string; email: string; name?: string | null };
}

export interface CohortSchedule {
  id: string;
  organizationId: string;
  cohortId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  lessonId?: string | null;
  meetingUrl?: string | null;
}

export interface UserTimezonePreference {
  userId: string;
  timezone: string;
  autoDetect: boolean;
  updatedAt: string | null;
}

// ── Phase 28: Proctoring & Integrity ────────────────────────────

export type ProctoringEventType =
  | "TAB_SWITCH"
  | "FULLSCREEN_EXIT"
  | "COPY_PASTE"
  | "LOOKING_AWAY"
  | "NO_FACE"
  | "MULTIPLE_FACES"
  | "PHONE_DETECTED"
  | "NOISE_DETECTED";

export type ProctoringSeverity = "LOW" | "MEDIUM" | "HIGH";
export type ProctoringFlagStatus = "OPEN" | "DISMISSED" | "UPHELD";
export type ProctoringSessionStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "FLAGGED"
  | "REVIEWED";

export interface ProctoringSession {
  id: string;
  organizationId: string;
  attemptId: string;
  attemptType: string;
  userId: string;
  status: ProctoringSessionStatus;
  startedAt: string;
  endedAt: string | null;
  integrityScore: number | null;
  metadata: Record<string, unknown>;
  user?: { id: string; email: string; name?: string | null };
  events?: ProctoringEvent[];
  flags?: ProctoringFlag[];
  _count?: { events: number; flags: number };
}

export interface ProctoringEvent {
  id: string;
  organizationId: string;
  sessionId: string;
  type: ProctoringEventType;
  severity: ProctoringSeverity;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface ProctoringFlag {
  id: string;
  organizationId: string;
  sessionId: string;
  eventId: string;
  status: ProctoringFlagStatus;
  notes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  event?: ProctoringEvent;
  session?: {
    id: string;
    userId: string;
    attemptId: string;
    attemptType: string;
  };
  reviewer?: { id: string; email: string; name?: string | null };
}

// ── Phase 29: Revenue Share & Payouts ────────────────────────────

export type RevenueShareScope = "PLATFORM" | "INSTRUCTOR" | "COURSE";
export type PayoutBeneficiaryType = "INSTRUCTOR" | "ORG" | "PLATFORM";
export type PayoutStatus = "PENDING" | "APPROVED" | "PAID" | "FAILED";
export type PayoutMethodType = "BANK" | "PAYPAL" | "STRIPE";
export type PayoutPeriodStatus = "OPEN" | "LOCKED" | "PAID";

export interface RevenueShareRule {
  id: string;
  organizationId: string;
  scope: RevenueShareScope;
  targetId?: string | null;
  percent: number;
  active: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutMethod {
  id: string;
  organizationId: string;
  beneficiaryType: PayoutBeneficiaryType;
  beneficiaryId: string;
  type: PayoutMethodType;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface PayoutPeriod {
  id: string;
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  status: PayoutPeriodStatus;
  totalAmount: number;
  lockedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  _count?: { payouts: number };
}

export interface Payout {
  id: string;
  organizationId: string;
  periodId: string;
  beneficiaryType: PayoutBeneficiaryType;
  beneficiaryId: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;
  status: PayoutStatus;
  reference?: string | null;
  paidAt?: string | null;
  createdAt: string;
  period?: { id: string; periodStart: string; periodEnd: string };
}

// ── Phase 30: Tax Regions & Rules ────────────────────────────────

export type TaxRuleType = "VAT" | "GST" | "SALES_TAX";
export type SupportedCurrency =
  | "USD"
  | "EUR"
  | "GBP"
  | "IDR"
  | "SGD"
  | "MYR"
  | "AUD"
  | "JPY"
  | "INR"
  | "BRL";

export interface TaxRegion {
  id: string;
  code: string;
  name: string;
  currency: string;
  taxPercent: number;
}

export interface TaxRule {
  id: string;
  organizationId: string;
  regionCode: string;
  rate: number;
  type: TaxRuleType;
  inclusive: boolean;
  active: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  region?: TaxRegion;
}

export interface TaxCalculationLine {
  type: TaxRuleType;
  rate: number;
  amount: number;
  inclusive: boolean;
}

export interface TaxCalculation {
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  regionCode: string;
  lines: TaxCalculationLine[];
}

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string | null;
  status: string;
  createdAt: string;
  membership: {
    id: string;
    status: string;
  } | null;
  roles: Array<{ key: string; name: string }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
