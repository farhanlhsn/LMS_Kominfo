"use client";

import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

export function MobileNav({
  items,
  currentPath,
}: {
  items: Array<{ label: string; href: string; icon: ReactNode }>;
  currentPath?: string;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card lg:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around py-2">
        {items.slice(0, 5).map((item) => {
          const active = currentPath?.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="h-5 w-5">{item.icon}</span>
              <span className="truncate max-w-16 text-center leading-tight">{item.label}</span>
            </a>
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
        <a
          href={backHref}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </a>
      ) : null}
      <h1 className="text-xl font-semibold leading-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm leading-5 text-muted-foreground">{subtitle}</p> : null}
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
        className
      )}
    >
      {children}
    </div>
  );
}
