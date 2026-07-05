"use client";

import { useCallback, useState } from "react";
import { ExternalLink, RefreshCw, X } from "lucide-react";
import { useIssuePopoutToken, useRevokePopoutToken } from "../../lib/api-hooks";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { StatusBadge } from "../ui/core";

export interface PopoutControlsProps {
  lessonId: string;
  panel?: string;
  onTokenChange?: (token: string | null) => void;
}

export function PopoutControls({ lessonId, panel = "notes", onTokenChange }: PopoutControlsProps) {
  const issue = useIssuePopoutToken();
  const revoke = useRevokePopoutToken();
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await issue({ lessonId, ttlMs: 60 * 60 * 1000 });
      setToken(result.token);
      setExpiresAt(result.expiresAt);
      onTokenChange?.(result.token);
      const url = `/learn/popout?lessonId=${encodeURIComponent(lessonId)}&panel=${encodeURIComponent(panel)}&token=${encodeURIComponent(result.token)}`;
      window.open(url, "lms-popout", "noopener=yes,width=520,height=720");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open popout");
    } finally {
      setBusy(false);
    }
  }, [issue, lessonId, panel, onTokenChange]);

  const handleRevoke = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      await revoke(token);
      setToken(null);
      setExpiresAt(null);
      onTokenChange?.(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke popout");
    } finally {
      setBusy(false);
    }
  }, [revoke, token, onTokenChange]);

  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold">Popout monitor</h3>
        <p className="text-sm text-muted-foreground">
          Open the workspace on a second screen with a short-lived session token.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {token ? (
            <>
              <StatusBadge tone="success" value="Active" />
              <span className="text-xs text-muted-foreground">
                Expires {expiresAt ? new Date(expiresAt).toLocaleString() : "soon"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(`/learn/popout?lessonId=${encodeURIComponent(lessonId)}&panel=${encodeURIComponent(panel)}&token=${encodeURIComponent(token)}`, "lms-popout")}
              >
                <ExternalLink className="mr-1 h-3 w-3" /> Reopen window
              </Button>
              <Button size="sm" variant="destructive" onClick={handleRevoke} disabled={busy}>
                <X className="mr-1 h-3 w-3" /> Revoke
              </Button>
            </>
          ) : (
            <Button onClick={handleOpen} disabled={busy}>
              <ExternalLink className="mr-2 h-4 w-4" /> {busy ? "Opening…" : "Open popout window"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onTokenChange?.(token)}>
            <RefreshCw className="mr-1 h-3 w-3" /> Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
