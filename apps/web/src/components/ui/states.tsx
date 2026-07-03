import { AlertTriangle, Inbox, Loader2, LockKeyhole } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { isForbiddenError } from "../../lib/authz";
import { cn } from "../../lib/utils";

interface StateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  icon?: LucideIcon;
}

export function EmptyState({
  title,
  description,
  action,
  className,
  icon: Icon = Inbox,
}: StateProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-dashed border-border bg-card p-8 text-center text-card-foreground",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className="mx-auto h-8 w-8 text-muted-foreground"
      />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

export function LoadingState({
  title,
  description = "Loading the latest workspace data.",
  className,
}: Omit<StateProps, "icon">) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card p-8 text-center text-card-foreground shadow-subtle",
        className,
      )}
      aria-live="polite"
    >
      <Loader2
        aria-hidden="true"
        className="mx-auto h-8 w-8 animate-spin text-primary"
      />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </section>
  );
}

export function ErrorState({
  title,
  description = "The request could not be completed.",
  action,
  className,
}: Omit<StateProps, "icon">) {
  return (
    <section
      className={cn(
        "rounded-lg border border-destructive/30 bg-card p-8 text-center text-card-foreground shadow-subtle",
        className,
      )}
      role="alert"
    >
      <AlertTriangle
        aria-hidden="true"
        className="mx-auto h-8 w-8 text-destructive"
      />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

export function ForbiddenState({
  title = "Permission required",
  description = "Your active organization or role does not allow this action.",
  action,
  className,
}: Partial<Omit<StateProps, "icon">>) {
  return (
    <section
      className={cn(
        "rounded-lg border border-warning/30 bg-card p-8 text-center text-card-foreground shadow-subtle",
        className,
      )}
    >
      <LockKeyhole
        aria-hidden="true"
        className="mx-auto h-8 w-8 text-warning"
      />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

export function ApiErrorState({
  error,
  fallbackTitle = "Request failed",
  fallbackDescription = "The request could not be completed.",
  className,
}: {
  error: unknown;
  fallbackTitle?: string;
  fallbackDescription?: string;
  className?: string;
}) {
  if (isForbiddenError(error)) {
    return <ForbiddenState className={className} />;
  }

  return (
    <ErrorState
      className={className}
      description={
        error instanceof Error ? error.message : fallbackDescription
      }
      title={fallbackTitle}
    />
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
    />
  );
}
