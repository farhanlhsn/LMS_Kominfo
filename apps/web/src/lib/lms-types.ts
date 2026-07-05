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

export interface LearnerDashboard {
  totalCourses: number;
  activeEnrollments: number;
  completedCourses: number;
  avgProgressPercent: number;
  monthlyActivityEvents: number;
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
