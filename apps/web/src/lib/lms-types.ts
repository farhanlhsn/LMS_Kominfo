export type CourseStatus =
  | "DRAFT"
  | "SUBMITTED_FOR_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export type CourseLevel =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "ALL_LEVELS";

export type ActivityTypeKey =
  | "core.text"
  | "core.video"
  | "core.file"
  | "core.link"
  | "core.quiz"
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
    | "IN_PROGRESS"
    | "SUBMITTED"
    | "GRADED"
    | "NEEDS_MANUAL_GRADING"
    | "EXPIRED";
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
