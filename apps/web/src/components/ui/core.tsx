import { Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const classes = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 border-primary",
    secondary: "bg-card text-foreground hover:bg-muted border-border",
    ghost: "border-transparent text-primary hover:bg-primary/10",
  };

  return (
    <a
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition",
        classes[variant],
        className,
      )}
      href={href}
    >
      {children}
    </a>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...props
}: {
  label: string;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-subtle transition hover:text-foreground",
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function StatusBadge({
  value,
  tone = "neutral",
}: {
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "border-border bg-muted text-muted-foreground",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
    info: "border-info/30 bg-info/10 text-info",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold",
        tones[tone],
      )}
    >
      {value}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumbs,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}) {
  return (
    <header className="mb-6">
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li
            key={`${item.label}-${index}`}
            className="flex items-center gap-2"
          >
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <a className="hover:text-foreground" href={item.href}>
                {item.label}
              </a>
            ) : (
              <span className="font-medium text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-subtle">
      <Icon aria-hidden="true" className="h-5 w-5 text-primary" />
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      {helper ? (
        <p className="mt-3 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </article>
  );
}

export function SearchInput({
  placeholder = "Search",
  value,
}: {
  placeholder?: string;
  value?: string;
}) {
  return (
    <label className="flex min-h-10 min-w-0 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
      <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="sr-only">{placeholder}</span>
      <input
        className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
        defaultValue={value}
        placeholder={placeholder}
        type="search"
      />
    </label>
  );
}

export function FilterBar({
  children,
  onClearLabel = "Clear filters",
}: {
  children: ReactNode;
  onClearLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 shadow-subtle">
      {children}
      <button
        className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        type="button"
      >
        <X aria-hidden="true" className="h-4 w-4" />
        {onClearLabel}
      </button>
    </div>
  );
}

export function SelectFilter({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  return (
    <label className="text-sm font-medium text-foreground">
      <span className="sr-only">{label}</span>
      <select className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground">
        <option>{label}</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
    >
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          className="rounded-md border border-border px-3 py-2 font-medium disabled:opacity-50"
          disabled={page <= 1}
          type="button"
        >
          Previous
        </button>
        <button
          className="rounded-md border border-border px-3 py-2 font-medium disabled:opacity-50"
          disabled={page >= totalPages}
          type="button"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-subtle">
      <div
        className="hidden bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid"
        style={{
          gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
        }}
      >
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div className="divide-y divide-border">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 px-4 py-3 text-sm md:items-center"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(12rem, 100%), 1fr))",
            }}
          >
            {row.map((cell, cellIndex) => (
              <div key={cellIndex}>{cell}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  defaultValue,
  multiline,
  helper,
  required,
}: {
  label: string;
  defaultValue?: string;
  multiline?: boolean;
  helper?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
      {multiline ? (
        <textarea
          className="mt-2 min-h-32 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          defaultValue={defaultValue}
        />
      ) : (
        <input
          className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          defaultValue={defaultValue}
          type="text"
        />
      )}
      {helper ? (
        <span className="mt-1 block text-xs text-muted-foreground">
          {helper}
        </span>
      ) : null}
    </label>
  );
}
