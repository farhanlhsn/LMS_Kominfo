"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ShieldCheck,
  UserCircle,
  X,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { SearchBar } from "../search/SearchBar";
import { IconButton } from "../ui/core";
import { NotificationBadge } from "../engagement/engagement";
import { ThemeModeToggle } from "../theme/theme-mode";
import { MobileNav } from "./mobile";
import {
  filterNavGroups,
  flatNavItems,
  isPrimaryMobilePath,
  MOBILE_PRIMARY_TABS,
  resolveActiveHref,
  type NavGroup,
} from "./nav-config";

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

function useRuntimeBranding(initial?: OrganizationBranding | null) {
  const [branding, setBranding] = useState<OrganizationBranding | null>(
    initial ?? null,
  );
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { api } = await import("../../lib/api-client");
        const next = await api.getBranding();
        if (active) {
          setBranding({
            logoUrl: next.logoUrl,
            faviconUrl: next.faviconUrl,
            primaryColor: next.primaryColor,
            secondaryColor: next.secondaryColor,
            accentColor: next.accentColor,
            radius: next.borderRadius,
            name: next.name,
            slug: next.slug,
          });
        }
      } catch {
        if (active) setBranding((current) => current ?? initial ?? null);
      }
    })();
    return () => {
      active = false;
    };
  }, [initial]);
  return branding;
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
  const resolvedBranding = useRuntimeBranding(branding);
  const pathname = usePathname();
  const path = currentPath ?? pathname;
  const moreActive = !immersive && !isPrimaryMobilePath(path);

  const mobileTabItems = useMemo(
    () =>
      MOBILE_PRIMARY_TABS.map((tab) => {
        if (tab.id === "more") {
          return {
            id: tab.id,
            label: tab.label,
            href: tab.href,
            isMore: true as const,
            icon: <Menu aria-hidden="true" className="h-5 w-5" />,
          };
        }
        const Icon =
          tab.id === "home"
            ? LayoutDashboard
            : tab.id === "catalog"
              ? BookOpen
              : tab.id === "learn"
                ? GraduationCap
                : MessageSquare;
        return {
          id: tab.id,
          label: tab.label,
          href: tab.href,
          isMore: false as const,
          icon: <Icon aria-hidden="true" className="h-5 w-5" />,
        };
      }),
    [],
  );

  return (
    <ThemeProvider branding={resolvedBranding}>
      <div className="min-h-screen bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        {!immersive ? (
          <DashboardSidebar branding={resolvedBranding} currentPath={path} />
        ) : null}
        {!immersive ? (
          <MobileSidebar
            branding={resolvedBranding}
            currentPath={path}
            onClose={() => setMobileOpen(false)}
            open={mobileOpen}
          />
        ) : null}
        <div className={immersive ? "" : "lg:pl-64"}>
          <DashboardTopbar
            branding={resolvedBranding}
            onOpenNavigation={() => setMobileOpen(true)}
            showNavigationButton={!immersive}
            showBackButton={showBackButton}
            backHref={backHref}
            backLabel={backLabel}
          />
          <main
            id="main-content"
            className={cn(
              "px-4 py-6 sm:px-6 lg:px-8",
              !immersive && "pb-20 lg:pb-6",
              immersive && "px-2 py-3 sm:px-4 lg:px-6",
              mainClassName,
            )}
          >
            {children}
          </main>
        </div>
        {!immersive ? (
          <MobileNav
            items={mobileTabItems}
            currentPath={path}
            moreActive={moreActive || mobileOpen}
            onMoreClick={() => setMobileOpen(true)}
          />
        ) : null}
      </div>
    </ThemeProvider>
  );
}

export function DashboardSidebar({
  currentPath,
  branding,
}: {
  currentPath?: string;
  branding?: OrganizationBranding | null;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
      <SidebarBrand branding={branding} />
      <DashboardNav currentPath={currentPath} />
    </aside>
  );
}

function SidebarBrand({ branding }: { branding?: OrganizationBranding | null }) {
  return (
    <div className="flex min-h-16 shrink-0 items-center gap-3 border-b border-border px-5">
      {branding?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={branding.name ?? "Organization"}
          className="h-9 w-9 rounded-md object-contain"
          src={branding.logoUrl}
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BookOpen aria-hidden="true" className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold leading-tight">
          {branding?.name ?? "LMS Platform"}
        </p>
        <p className="text-xs text-muted-foreground">Learning workspace</p>
      </div>
    </div>
  );
}

function DashboardNav({
  currentPath,
  onNavigate,
  forceExpandAll = false,
}: {
  currentPath?: string;
  onNavigate?: () => void;
  /** Mobile drawer: show all groups expanded */
  forceExpandAll?: boolean;
}) {
  const session = useSession();
  const pathname = usePathname();
  const path = currentPath ?? pathname;
  const visibleKeys = useMemo(
    () => new Set(visibleNavigationKeys(session)),
    [session],
  );

  const visibleGroups = useMemo(
    () => filterNavGroups(visibleKeys),
    [visibleKeys],
  );

  const allVisibleItems = useMemo(
    () => flatNavItems(visibleGroups),
    [visibleGroups],
  );

  const activeHref = useMemo(
    () => resolveActiveHref(path, allVisibleItems),
    [path, allVisibleItems],
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      for (const group of visibleGroups) {
        if (!group.collapsible) {
          next[group.id] = true;
          continue;
        }
        if (forceExpandAll) {
          next[group.id] = true;
          continue;
        }
        // Auto-expand when route is under this group
        if (group.pathPrefix && path.startsWith(group.pathPrefix)) {
          next[group.id] = true;
        } else if (next[group.id] === undefined) {
          next[group.id] = false;
        }
      }
      return next;
    });
  }, [path, visibleGroups, forceExpandAll]);

  function toggleGroup(group: NavGroup) {
    if (!group.collapsible || forceExpandAll) return;
    setExpanded((prev) => ({ ...prev, [group.id]: !prev[group.id] }));
  }

  return (
    <nav
      aria-label="Primary"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [scrollbar-gutter:stable]"
    >
      <div className="space-y-4 pb-4">
        {visibleGroups.map((group) => {
          const isOpen =
            forceExpandAll ||
            !group.collapsible ||
            Boolean(expanded[group.id]);
          return (
            <div key={group.id}>
              {group.collapsible && !forceExpandAll ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  aria-expanded={isOpen}
                  className="mb-1 flex w-full items-center justify-between rounded-md px-3 py-1 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <span>{group.label}</span>
                  {isOpen ? (
                    <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : (
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
              )}
              {isOpen ? (
                <div className="space-y-0.5">
                  {group.items.map(({ id, href, icon: Icon, label }) => {
                    const active = activeHref === href;
                    return (
                      <Link
                        key={id}
                        href={href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        title={label}
                        className={cn(
                          "flex min-h-9 items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon aria-hidden={true} className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 truncate">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function MobileSidebar({
  currentPath,
  open,
  onClose,
  branding,
}: {
  currentPath?: string;
  open: boolean;
  onClose: () => void;
  branding?: OrganizationBranding | null;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        aria-label="Dismiss navigation overlay"
        className="absolute inset-0 bg-foreground/30"
        onClick={onClose}
        type="button"
      />
      <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-panel">
        <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <div className="flex min-w-0 items-center gap-3">
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={branding.name ?? "Organization"}
                className="h-9 w-9 rounded-md object-contain"
                src={branding.logoUrl}
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BookOpen aria-hidden="true" className="h-5 w-5" />
              </div>
            )}
            <span className="min-w-0 truncate text-sm font-semibold">
              {branding?.name ?? "LMS Platform"}
            </span>
          </div>
          <IconButton label="Close navigation" onClick={onClose}>
            <X aria-hidden="true" className="h-4 w-4" />
          </IconButton>
        </div>
        <DashboardNav
          currentPath={currentPath}
          onNavigate={onClose}
          forceExpandAll
        />
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
  branding,
}: {
  onOpenNavigation?: () => void;
  showNavigationButton?: boolean;
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
  branding?: OrganizationBranding | null;
}) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [searchOpen]);

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
          <span className="hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
            {branding?.name ?? "LMS Platform"}
          </span>
          {/* Search with dropdown */}
          <div className="relative" ref={searchRef}>
            <IconButton label="Search" onClick={() => setSearchOpen((v) => !v)}>
              <Search aria-hidden="true" className="h-4 w-4" />
            </IconButton>
            {searchOpen && (
              <div className="absolute right-0 top-12 z-50 w-[28rem] max-w-[90vw] rounded-xl border border-border bg-card p-3 shadow-panel">
                <SearchBar
                  placeholder="Search courses, lessons, people…"
                  onSelect={(hit) => {
                    setSearchOpen(false);
                    router.push(hit.url);
                  }}
                />
              </div>
            )}
          </div>
          <ThemeModeToggle />
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
