import { PERMISSIONS } from "@lms/shared";
import type { AuthSession } from "./lms-types";

export type NavigationKey =
  | "dashboard"
  | "catalog"
  | "my-learning"
  | "admin"
  | "instructor"
  | "quizzes"
  | "files"
  | "library"
  | "plugins"
  | "moderation";

export function hasPermission(
  session: AuthSession | null,
  permission: string,
) {
  const organization = session?.activeOrganization;
  return Boolean(
    organization?.isPlatformAdmin ||
      organization?.permissionKeys?.includes(permission),
  );
}

export function hasAnyPermission(
  session: AuthSession | null,
  permissions: readonly string[],
) {
  if (permissions.length === 0) return Boolean(session);
  return permissions.some((permission) => hasPermission(session, permission));
}

export function canUseInstructorWorkspace(session: AuthSession | null) {
  return hasAnyPermission(session, [
    PERMISSIONS.coursesCreate,
    PERMISSIONS.coursesUpdate,
    PERMISSIONS.coursesPublish,
  ]);
}

export function canUseFileWorkspace(session: AuthSession | null) {
  return hasAnyPermission(session, [
    PERMISSIONS.filesRead,
    PERMISSIONS.filesCreate,
    PERMISSIONS.filesDelete,
  ]);
}

export function canUseContentLibrary(session: AuthSession | null) {
  return hasPermission(session, PERMISSIONS.contentLibraryManage);
}

export function canManageQuizzes(session: AuthSession | null) {
  return hasPermission(session, PERMISSIONS.quizManage);
}

export function canConfigurePlugins(session: AuthSession | null) {
  return hasPermission(session, PERMISSIONS.pluginsConfigure);
}

export function visibleNavigationKeys(session: AuthSession | null) {
  const keys: NavigationKey[] = ["dashboard", "catalog", "my-learning"];
  const canAccessAdminArea = Boolean(
    session?.activeOrganization.isPlatformAdmin ||
      session?.activeOrganization.roleKeys?.includes("org_admin"),
  );

  if (canUseInstructorWorkspace(session)) keys.push("instructor");
  if (canManageQuizzes(session)) keys.push("quizzes");
  if (canUseFileWorkspace(session)) keys.push("files");
  if (canUseContentLibrary(session)) keys.push("library");
  if (canConfigurePlugins(session)) keys.push("plugins");
  if (canAccessAdminArea) keys.push("admin", "moderation");

  return keys;
}

export function isForbiddenError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 403
  );
}
