import { Compass, Home, Search } from "lucide-react";
import { ButtonLink } from "../components/ui/core";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          404
        </p>
        <div
          aria-hidden="true"
          className="mt-3 flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-primary/40 bg-primary/5 text-primary"
        >
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-normal">
          Page not found
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          We couldn&apos;t find what you were looking for. The page may have
          been moved, renamed, or never existed.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/" variant="primary">
            <Home aria-hidden="true" className="h-4 w-4" />
            Go home
          </ButtonLink>
          <ButtonLink href="/courses" variant="secondary">
            <Search aria-hidden="true" className="h-4 w-4" />
            Browse courses
          </ButtonLink>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Need help? Contact your organization administrator.
        </p>
      </div>
    </div>
  );
}
