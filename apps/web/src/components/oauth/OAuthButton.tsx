"use client";

import { useCallback, useState } from "react";
import { api } from "../../lib/api-client";
import { Button } from "../ui/button";
import type { OAuthProvider } from "../../lib/lms-types";

export interface OAuthButtonProps {
  provider: OAuthProvider;
  onCode?: (code: string) => void;
  onStart?: (provider: OAuthProvider) => void;
  label?: string;
  className?: string;
}

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  GOOGLE: "Continue with Google",
  MICROSOFT: "Continue with Microsoft",
};

export function OAuthButton({ provider, onCode, onStart, label, className }: OAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      onStart?.(provider);
      const redirectUri = typeof window !== "undefined" ? window.location.origin : undefined;
      const { data } = await api.startOAuth(provider, redirectUri);
      if (typeof window !== "undefined") {
        // Real implementation would redirect the browser to the provider.
        // For the mock flow we surface the authorization URL and simulate a
        // successful callback with a stable test code.
        window.sessionStorage.setItem(`oauth.pending.${provider}`, data.state);
      }
      // The mock provider just expects a code, so we use a known string.
      const mockCode = `mock-${provider.toLowerCase()}-${Date.now()}`;
      const callback = await api.finishOAuth(provider, mockCode);
      if ("code" in callback.data) {
        onCode?.(mockCode);
      } else {
        onCode?.(mockCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth failed");
    } finally {
      setLoading(false);
    }
  }, [provider, onCode, onStart]);

  return (
    <div className={className}>
      <Button
        onClick={handleClick}
        disabled={loading}
        variant="outline"
        className="w-full"
        aria-label={label ?? PROVIDER_LABELS[provider]}
      >
        {loading ? "Connecting…" : (label ?? PROVIDER_LABELS[provider])}
      </Button>
      {error ? (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
