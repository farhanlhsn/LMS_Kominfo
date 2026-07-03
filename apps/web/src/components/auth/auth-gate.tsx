"use client";

import { LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRequireSession } from "../../lib/api-hooks";
import { hasAnyPermission } from "../../lib/authz";
import { ButtonLink } from "../ui/core";
import { ForbiddenState, LoadingState } from "../ui/states";

export function AuthGate({ children }: { children: ReactNode }) {
  const { checked, unauthenticated } = useRequireSession();

  useEffect(() => {
    if (unauthenticated && window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }, [unauthenticated]);

  if (!checked) {
    return <LoadingState title="Checking session" />;
  }

  if (unauthenticated) {
    return (
      <section className="rounded-lg border border-border bg-card p-8 text-center shadow-subtle">
        <LockKeyhole
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-primary"
        />
        <h1 className="mt-4 text-lg font-semibold">Login required</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Sign in with a seeded account to use the active organization workspace.
        </p>
        <ButtonLink className="mt-5" href="/login">
          Login
        </ButtonLink>
      </section>
    );
  }

  return <>{children}</>;
}

export function PermissionGate({
  anyOf,
  children,
}: {
  anyOf: string[];
  children: ReactNode;
}) {
  const { session, checked } = useRequireSession();

  if (!checked || (session && !session.activeOrganization.permissionKeys)) {
    return <LoadingState title="Checking permissions" />;
  }

  if (!hasAnyPermission(session, anyOf)) {
    return <ForbiddenState />;
  }

  return <>{children}</>;
}
