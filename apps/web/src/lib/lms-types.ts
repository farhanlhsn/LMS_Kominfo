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
  type: "RICH_TEXT" | "VIDEO" | "FILE" | "PDF" | "LINK" | "IMAGE";
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
}

export interface QuestionBank {
  id: string;
  title: string;
  description?: string | null;
  courseId?: string | null;
  _count?: { questions?: number };
}

export interface QuizQuestion {
  id: string;
  questionId: string;
  orderIndex: number;
  points?: number | null;
  question: Question;
}

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
  questions?: QuizQuestion[];
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

export interface RubricLevel {
  id: string;
  title: string;
  description?: string | null;
  points: number;
  orderIndex: number;
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
