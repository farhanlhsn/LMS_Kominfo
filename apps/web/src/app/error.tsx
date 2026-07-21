"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { ErrorState } from "../components/ui/states";
import { ButtonLink } from "../components/ui/core";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console so developers can pick this up. Avoid leaking
    // sensitive details to the user.
    // eslint-disable-next-line no-console
    console.error("[LMS] Route error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center p-6">
        <ErrorState
          title="Something went wrong"
          description={
            error?.message
              ? error.message
              : "The page could not be rendered. Please try again or return to the home page."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                aria-label="Try again"
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                onClick={reset}
                type="button"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Try again
              </button>
              <ButtonLink href="/" variant="secondary">
                <Home aria-hidden="true" className="h-4 w-4" />
                Go home
              </ButtonLink>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <AlertTriangle aria-hidden="true" className="h-3 w-3" />
                {error?.digest ? `Reference: ${error.digest}` : "No reference id"}
              </span>
            </div>
          }
        />
      </div>
    </div>
  );
}
