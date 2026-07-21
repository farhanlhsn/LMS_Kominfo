"use client";

import Link from "next/link";
import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

export function MobileNav({
  items,
  currentPath,
  moreActive,
  onMoreClick,
}: {
  items: Array<{
    id: string;
    label: string;
    href: string;
    icon: ReactNode;
    isMore?: boolean;
  }>;
  currentPath?: string;
  moreActive?: boolean;
  onMoreClick?: () => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      role="navigation"
      aria-label="Mobile primary"
    >
      <div className="flex items-center justify-around py-2">
        {items.slice(0, 5).map((item) => {
          const active = item.isMore
            ? Boolean(moreActive)
            : item.href === "/"
              ? currentPath === "/"
              : Boolean(
                  currentPath === item.href ||
                    currentPath?.startsWith(`${item.href}/`),
                );
          if (item.isMore) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={onMoreClick}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1 text-[10px] font-medium transition",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center">
                  {item.icon}
                </span>
                <span className="max-w-16 truncate text-center leading-tight">
                  {item.label}
                </span>
              </button>
            );
          }
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1 text-[10px] font-medium transition",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center">
                {item.icon}
              </span>
              <span className="max-w-16 truncate text-center leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobilePageHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  return (
    <header className="mb-4 px-1">
      {backHref ? (
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
      ) : null}
      <h1 className="text-xl font-semibold leading-tight">{title}</h1>
      {subtitle ? (
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{subtitle}</p>
      ) : null}
    </header>
  );
}

export function MobileCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-subtle",
        className,
      )}
    >
      {children}
    </div>
  );
}
