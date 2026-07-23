import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  CircleDot,
  ClipboardList,
  BarChart3,
  FileText,
  FolderOpen,
  GraduationCap,
  Globe,
  Heart,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Library,
  ListChecks,
  MessageSquare,
  MessageSquareQuote,
  Plug,
  Radio,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Tag,
  Trophy,
  Wallet,
} from "lucide-react";
import type { NavigationKey } from "../../lib/authz";

/**
 * Navigation item typing (P5):
 * - `id` — unique React key (usually the href)
 * - `rbacKey` — permission bucket for `visibleNavigationKeys` (many items share one key)
 * Never use rbacKey alone as a React key.
 */
export type NavItem = {
  /** Unique id (href) for React keys */
  id: string;
  /** RBAC key from visibleNavigationKeys */
  rbacKey: NavigationKey;
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  id: "learning" | "instructor" | "administration";
  label: string;
  /** Collapse on desktop unless path matches or user expands */
  collapsible: boolean;
  pathPrefix?: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    id: "learning",
    label: "Learning",
    collapsible: false,
    items: [
      { id: "/", rbacKey: "dashboard", href: "/", label: "Dashboard", icon: LayoutDashboard },
      { id: "/courses", rbacKey: "catalog", href: "/courses", label: "Catalog", icon: BookOpen },
      { id: "/search", rbacKey: "catalog", href: "/search", label: "Search", icon: Search },
      { id: "/my-learning", rbacKey: "my-learning", href: "/my-learning", label: "My Learning", icon: GraduationCap },
      { id: "/live-classes", rbacKey: "my-learning", href: "/live-classes", label: "Live Classes", icon: Radio },
      { id: "/discussions", rbacKey: "my-learning", href: "/discussions", label: "Discussions", icon: MessageSquare },
      { id: "/calendar", rbacKey: "my-learning", href: "/calendar", label: "Calendar", icon: CalendarDays },
      { id: "/learning-paths", rbacKey: "my-learning", href: "/learning-paths", label: "Learning Paths", icon: BookOpen },
      { id: "/leaderboard", rbacKey: "my-learning", href: "/leaderboard", label: "Leaderboard", icon: Trophy },
      { id: "/achievements", rbacKey: "my-learning", href: "/achievements", label: "Achievements", icon: Award },
      { id: "/wishlist", rbacKey: "my-learning", href: "/wishlist", label: "Wishlist", icon: Heart },
      { id: "/help", rbacKey: "my-learning", href: "/help", label: "Help Center", icon: HelpCircle },
      { id: "/messages", rbacKey: "my-learning", href: "/messages", label: "Messages", icon: MessageSquare },
    ],
  },
  {
    id: "instructor",
    label: "Instructor",
    collapsible: true,
    pathPrefix: "/instructor",
    items: [
      { id: "/instructor/courses", rbacKey: "instructor", href: "/instructor/courses", label: "My Courses", icon: Settings },
      { id: "/instructor/quizzes", rbacKey: "quizzes", href: "/instructor/quizzes", label: "Quizzes", icon: ListChecks },
      { id: "/instructor/question-banks", rbacKey: "quizzes", href: "/instructor/question-banks", label: "Question banks", icon: HelpCircle },
      { id: "/instructor/files", rbacKey: "files", href: "/instructor/files", label: "Files", icon: FolderOpen },
      { id: "/instructor/content-library", rbacKey: "library", href: "/instructor/content-library", label: "Library", icon: Library },
      { id: "/instructor/discussions", rbacKey: "instructor", href: "/instructor/discussions", label: "Discussions", icon: MessageSquare },
      { id: "/instructor/calendar", rbacKey: "instructor", href: "/instructor/calendar", label: "Teaching Schedule", icon: CalendarDays },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    collapsible: true,
    pathPrefix: "/admin",
    items: [
      { id: "/admin", rbacKey: "admin", href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
      { id: "/admin/members", rbacKey: "admin", href: "/admin/members", label: "Members & Roles", icon: ShieldCheck },
      { id: "/admin/access-control", rbacKey: "admin", href: "/admin/access-control", label: "Access Control", icon: KeyRound },
      { id: "/admin/users", rbacKey: "admin", href: "/admin/users", label: "Users", icon: ShieldCheck },
      { id: "/admin/organizations", rbacKey: "admin", href: "/admin/organizations", label: "Organizations", icon: Building2 },
      { id: "/admin/orders", rbacKey: "admin", href: "/admin/orders", label: "Orders", icon: Receipt },
      { id: "/admin/payments", rbacKey: "admin", href: "/admin/payments", label: "Payments", icon: Wallet },
      { id: "/admin/coupons", rbacKey: "admin", href: "/admin/coupons", label: "Coupons", icon: Tag },
      { id: "/admin/reviews", rbacKey: "admin", href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
      { id: "/admin/surveys", rbacKey: "admin", href: "/admin/surveys", label: "Surveys", icon: ClipboardList },
      { id: "/admin/polls", rbacKey: "admin", href: "/admin/polls", label: "Polls", icon: CircleDot },
      { id: "/admin/feedback", rbacKey: "admin", href: "/admin/feedback", label: "Feedback", icon: MessageSquareQuote },
      { id: "/admin/xapi", rbacKey: "admin", href: "/admin/xapi", label: "xAPI Statements", icon: BarChart3 },
      { id: "/admin/help", rbacKey: "admin", href: "/admin/help", label: "Help Center", icon: HelpCircle },
      { id: "/admin/cohorts", rbacKey: "admin", href: "/admin/cohorts", label: "Cohorts", icon: CalendarDays },
      { id: "/admin/certificate-templates", rbacKey: "admin", href: "/admin/certificate-templates", label: "Certificates", icon: Award },
      { id: "/admin/bulk", rbacKey: "admin", href: "/admin/bulk", label: "Bulk Ops", icon: Activity },
      { id: "/admin/search/analytics", rbacKey: "admin", href: "/admin/search/analytics", label: "Search Analytics", icon: Search },
      { id: "/admin/audit-logs", rbacKey: "admin", href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
      { id: "/admin/enterprise/branding", rbacKey: "admin", href: "/admin/enterprise/branding", label: "Branding", icon: Globe },
      { id: "/admin/enterprise/sso", rbacKey: "admin", href: "/admin/enterprise/sso", label: "SSO Providers", icon: KeyRound },
      { id: "/admin/enterprise/domains", rbacKey: "admin", href: "/admin/enterprise/domains", label: "Verified Domains", icon: ShieldCheck },
      { id: "/admin/enterprise/api-keys", rbacKey: "admin", href: "/admin/enterprise/api-keys", label: "API Keys", icon: KeyRound },
      { id: "/admin/enterprise/webhooks", rbacKey: "admin", href: "/admin/enterprise/webhooks", label: "Webhooks", icon: Plug },
      { id: "/admin/enterprise/login-policy", rbacKey: "admin", href: "/admin/enterprise/login-policy", label: "Login Policy", icon: ShieldCheck },
      { id: "/admin/discussions", rbacKey: "moderation", href: "/admin/discussions", label: "Moderation", icon: ShieldCheck },
      { id: "/admin/plugins", rbacKey: "plugins", href: "/admin/plugins", label: "Plugins", icon: Plug },
      { id: "/admin/plugin-marketplace", rbacKey: "plugins", href: "/admin/plugin-marketplace", label: "Plugin Marketplace", icon: LayoutGrid },
    ],
  },
];

/** Exact-match-only hrefs: parent/index routes that should not stay active on children. */
export const EXACT_MATCH_HREFS = new Set(["/", "/admin", "/instructor/courses"]);

export function matchesNavigationPath(path: string, href: string) {
  if (EXACT_MATCH_HREFS.has(href)) return path === href;
  return path === href || path.startsWith(`${href}/`);
}

export function filterNavGroups(visibleKeys: Set<string>): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => visibleKeys.has(item.rbacKey)),
    }))
    .filter((group) => group.items.length > 0);
}

export function flatNavItems(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items);
}

export function resolveActiveHref(pathname: string, items: NavItem[]): string | null {
  return (
    items
      .filter((item) => matchesNavigationPath(pathname, item.href))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null
  );
}

/** Bottom tab destinations (href). "more" is synthetic. */
export type MobileTabId = "home" | "catalog" | "learn" | "messages" | "more";

export const MOBILE_PRIMARY_TABS: Array<{
  id: MobileTabId;
  href: string;
  label: string;
  match: (path: string) => boolean;
}> = [
  {
    id: "home",
    href: "/",
    label: "Home",
    match: (path) => path === "/",
  },
  {
    id: "catalog",
    href: "/courses",
    label: "Catalog",
    match: (path) => path === "/courses" || path.startsWith("/courses/"),
  },
  {
    id: "learn",
    href: "/my-learning",
    label: "Learn",
    match: (path) =>
      path === "/my-learning" ||
      path.startsWith("/my-learning/") ||
      path.startsWith("/learn/"),
  },
  {
    id: "messages",
    href: "/messages",
    label: "Inbox",
    match: (path) => path === "/messages" || path.startsWith("/messages/"),
  },
  {
    id: "more",
    href: "#more",
    label: "More",
    match: () => false,
  },
];

export function isPrimaryMobilePath(path: string): boolean {
  return MOBILE_PRIMARY_TABS.filter((t) => t.id !== "more").some((t) => t.match(path));
}
