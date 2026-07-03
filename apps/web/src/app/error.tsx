"use client";

import { ErrorState } from "../components/ui/states";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <ErrorState
        title="Something went wrong"
        description="The page could not be rendered."
        action={
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
        }
      />
    </div>
  );
}
