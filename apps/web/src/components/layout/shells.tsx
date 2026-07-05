"use client";

import Link from "next/link";
import {
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  FolderOpen,
  GraduationCap,
  Library,
  ListChecks,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Plug,
  UserCircle,
  X,
  CalendarDays,
  Radio,
  MessageSquare,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { resolveOrganizationTheme } from "../../lib/theme";
import type { OrganizationBranding } from "../../lib/theme";
import {
  useLogout,
  useOrganizations,
  useSession,
  useSwitchOrganization,
} from "../../lib/api-hooks";
import { visibleNavigationKeys } from "../../lib/authz";
import { cn } from "../../lib/utils";
import { IconButton } from "../ui/core";
import { NotificationBadge } from "../engagement/engagement";

const dashboardNav = [
  { key: "dashboard", href: "/", label: "Dashboard", icon: LayoutDashboard },
  { key: "catalog", href: "/courses", label: "Catalog", icon: BookOpen },
  {
    key: "my-learning",
    href: "/my-learning",
    label: "My Learning",
    icon: GraduationCap,
  },
  { key: "my-learning", href: "/live-classes", label: "Live classes", icon: Radio },
  { key: "my-learning", href: "/discussions", label: "Discussions", icon: MessageSquare },
  { key: "my-learning", href: "/calendar", label: "Calendar", icon: CalendarDays },
  {
    key: "instructor",
    href: "/instructor/courses",
    label: "Instructor",
    icon: Settings,
  },
  { key: "instructor", href: "/instructor/discussions", label: "Discussions", icon: MessageSquare },
  { key: "instructor", href: "/instructor/calendar", label: "Teaching schedule", icon: CalendarDays },
  { key: "moderation", href: "/admin/discussions", label: "Moderation", icon: ShieldCheck },
  {
    key: "quizzes",
    href: "/instructor/quizzes",
    label: "Quizzes",
    icon: ListChecks,
  },
  { key: "files", href: "/instructor/files", label: "Files", icon: FolderOpen },
  {
    key: "library",
    href: "/instructor/content-library",
    label: "Library",
    icon: Library,
  },
  {
    key: "plugins",
    href: "/admin/plugins",
    label: "Plugins",
    icon: Plug,
  },
] as const;

export function ThemeProvider({
  branding,
  children,
}: {
  branding?: OrganizationBranding | null;
  children: ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={resolveOrganizationTheme(branding)}
    >
      {children}
    </div>
  );
}

export function AppShell({
  children,
  currentPath,
  branding,
  immersive = false,
  mainClassName,
  showBackButton = false,
  backHref = "/",
  backLabel = "Dashboard",
}: {
  children: ReactNode;
  currentPath?: string;
  branding?: OrganizationBranding | null;
  immersive?: boolean;
  mainClassName?: string;
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ThemeProvider branding={branding}>
      <div className="min-h-screen bg-background text-foreground">
        {!immersive ? <DashboardSidebar currentPath={currentPath} /> : null}
        {!immersive ? (
          <MobileSidebar
            currentPath={currentPath}
            onClose={() => setMobileOpen(false)}
            open={mobileOpen}
          />
        ) : null}
        <div className={immersive ? "" : "lg:pl-64"}>
          <DashboardTopbar
            onOpenNavigation={() => setMobileOpen(true)}
            showNavigationButton={!immersive}
            showBackButton={showBackButton}
            backHref={backHref}
            backLabel={backLabel}
          />
          <main
            className={cn(
              "px-4 py-6 sm:px-6 lg:px-8",
              immersive && "px-2 py-3 sm:px-4 lg:px-6",
              mainClassName,
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}

export function DashboardSidebar({ currentPath }: { currentPath?: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card lg:block">
      <SidebarBrand />
      <DashboardNav currentPath={currentPath} />
    </aside>
  );
}

function SidebarBrand() {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-border px-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <BookOpen aria-hidden="true" className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold">LMS Platform</p>
        <p className="text-xs text-muted-foreground">Learning workspace</p>
      </div>
    </div>
  );
}

function DashboardNav({
  currentPath,
  onNavigate,
}: {
  currentPath?: string;
  onNavigate?: () => void;
}) {
  const session = useSession();
  const visibleKeys = useMemo(
    () => new Set(visibleNavigationKeys(session)),
    [session],
  );

  return (
    <nav aria-label="Primary" className="space-y-1 p-3">
      {dashboardNav
        .filter((item) => visibleKeys.has(item.key))
        .map(({ href, icon: Icon, label }) => {
          const active =
            currentPath === href ||
            (href !== "/" && currentPath?.startsWith(href));

          return (
            <Link
              key={href}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              href={href}
              onClick={onNavigate}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
    </nav>
  );
}

function MobileSidebar({
  currentPath,
  open,
  onClose,
}: {
  currentPath?: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        aria-label="Close navigation"
        className="absolute inset-0 bg-foreground/30"
        onClick={onClose}
        type="button"
      />
      <aside className="relative h-full w-72 max-w-[85vw] border-r border-border bg-card shadow-panel">
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BookOpen aria-hidden="true" className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold">LMS Platform</span>
          </div>
          <IconButton label="Close navigation" onClick={onClose}>
            <X aria-hidden="true" className="h-4 w-4" />
          </IconButton>
        </div>
        <DashboardNav currentPath={currentPath} onNavigate={onClose} />
      </aside>
    </div>
  );
}

export function DashboardTopbar({
  onOpenNavigation,
  showNavigationButton = true,
  showBackButton = false,
  backHref = "/",
  backLabel = "Dashboard",
}: {
  onOpenNavigation?: () => void;
  showNavigationButton?: boolean;
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {showBackButton ? (
            <Link
              className="inline-flex min-w-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-subtle hover:bg-muted"
              href={backHref}
              title={backLabel}
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4 text-primary" />
              <span className="max-w-40 truncate">{backLabel}</span>
            </Link>
          ) : null}
          {showNavigationButton ? (
            <IconButton
              className="lg:hidden"
              label="Open navigation"
              onClick={onOpenNavigation}
            >
              <Menu aria-hidden="true" className="h-4 w-4" />
            </IconButton>
          ) : null}
          <OrganizationSwitcher />
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Search">
            <Search aria-hidden="true" className="h-4 w-4" />
          </IconButton>
          <NotificationBadge />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export function OrganizationSwitcher() {
  const session = useSession();
  const organizationsQuery = useOrganizations();
  const switchOrganization = useSwitchOrganization();
  const [open, setOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const name = session?.activeOrganization?.name ?? "No organization";
  const organizations = session?.organizations?.length
    ? session.organizations
    : organizationsQuery.data ?? [];

  async function selectOrganization(organizationId: string) {
    setSwitchingId(organizationId);
    await switchOrganization(organizationId).catch(() => {
      setSwitchingId(null);
    });
  }

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-semibold shadow-subtle"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Building2 aria-hidden="true" className="h-4 w-4 text-primary" />
        <span className="hidden max-w-48 truncate sm:inline">{name}</span>
        <span className="sm:hidden">Org</span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 text-muted-foreground"
        />
      </button>
      {open ? (
        <div className="absolute left-0 top-12 z-30 w-72 rounded-lg border border-border bg-card p-2 shadow-panel">
          <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Active organization
          </p>
          <div className="grid gap-1">
            {organizations.map((organization) => {
              const active = organization.id === session?.activeOrganization?.id;
              return (
                <button
                  key={organization.id}
                  className={cn(
                    "flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm hover:bg-muted disabled:cursor-default",
                    active ? "text-primary" : "text-foreground",
                  )}
                  disabled={active || switchingId === organization.id}
                  onClick={() => void selectOrganization(organization.id)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {organization.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {organization.slug}
                    </span>
                  </span>
                  {active ? <Check aria-hidden="true" className="h-4 w-4" /> : null}
                </button>
              );
            })}
            {!organizations.length ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                No active organizations available.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function UserMenu() {
  const session = useSession();
  const logout = useLogout();
  const name = session?.user?.name ?? session?.user?.email ?? "User";

  return (
    <button
      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-semibold shadow-subtle"
      onClick={() => void logout()}
      type="button"
    >
      <UserCircle aria-hidden="true" className="h-5 w-5 text-primary" />
      <span className="hidden sm:inline">{name}</span>
      <LogOut aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

export function PublicNavbar() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3 font-semibold" href="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen aria-hidden="true" className="h-5 w-5" />
          </span>
          <span>LMS Platform</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <Link className="hover:text-foreground" href="/courses">
            Courses
          </Link>
          <Link className="hover:text-foreground" href="/my-learning">
            My Learning
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <span>LMS Platform</span>
        <span>Generic multi-tenant learning experience</span>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PublicNavbar />
      <main>{children}</main>
      <PublicFooter />
    </ThemeProvider>
  );
}

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <ThemeProvider>
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-panel">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          {children}
        </section>
      </main>
    </ThemeProvider>
  );
}

export function ThemePreviewCard() {
  return (
    <article className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-subtle">
      <p className="text-sm font-semibold">Theme preview</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Organization colors will map to semantic tokens.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {["bg-primary", "bg-secondary", "bg-accent"].map((className) => (
          <div key={className} className={cn("h-12 rounded-md", className)} />
        ))}
      </div>
    </article>
  );
}
