export const SYSTEM_ROLES = {
  superAdmin: "super_admin",
  orgAdmin: "org_admin",
  courseManager: "course_manager",
  instructor: "instructor",
  assistantInstructor: "assistant_instructor",
  reviewer: "reviewer",
  mentor: "mentor",
  learner: "learner",
  supportAdmin: "support_admin",
  financeAdmin: "finance_admin",
} as const;

export const PERMISSIONS = {
  platformAdmin: "platform:admin",
  organizationsManage: "organizations:manage",
  membershipsManage: "memberships:manage",
  rolesManage: "roles:manage",
  rolesView: "roles:view",
  rolesAssign: "roles:assign",
  rolesOverride: "roles:override",
  rolesSwitch: "roles:switch",
  auditRead: "audit:read",
  usersRead: "users:read",
  usersUpdate: "users:update",
  coursesRead: "courses:read",
  coursesCreate: "courses:create",
  coursesUpdate: "courses:update",
  coursesPublish: "courses:publish",
  filesRead: "files:read",
  filesCreate: "files:create",
  filesDelete: "files:delete",
  contentLibraryManage: "content-library:manage",
  contentProcess: "content:process",
  quizManage: "quiz:manage",
  quizGrade: "quiz:grade",
  assignmentsManage: "assignments:manage",
  assignmentsGrade: "assignments:grade",
  assessmentsTake: "assessments:take",
  certificatesManage: "certificates:manage",
  certificatesIssue: "certificates:issue",
  goalsManage: "goals:manage",
  pluginsConfigure: "plugins:configure",
  analyticsView: "analytics:view",
  analyticsExport: "analytics:export",
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ACCESS_CONTEXT_TYPES = [
  "SYSTEM",
  "ORGANIZATION",
  "USER",
  "COURSE_CATEGORY",
  "COURSE",
  "MODULE",
  "ACTIVITY",
  "PLUGIN",
] as const;

export type AccessContextType = (typeof ACCESS_CONTEXT_TYPES)[number];

export const CAPABILITY_EFFECTS = [
  "INHERIT",
  "ALLOW",
  "PREVENT",
  "PROHIBIT",
] as const;

export type CapabilityEffect = (typeof CAPABILITY_EFFECTS)[number];

export const CAPABILITY_RISKS = {
  personalData: 1,
  spam: 2,
  xss: 4,
  configuration: 8,
  dataLoss: 16,
  financial: 32,
} as const;
