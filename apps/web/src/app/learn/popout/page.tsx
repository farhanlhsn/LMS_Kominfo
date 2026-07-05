"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, StatusBadge } from "../../../components/ui/core";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { ApiErrorState, LoadingState } from "../../../components/ui/states";
import { useValidatePopoutToken } from "../../../lib/api-hooks";
import { PopoutControls } from "../../../components/popout/popout-controls";

export default function LearnPopoutPage() {
  return (
    <AuthGate>
      <AppShell currentPath="/learn/popout">
        <PageHeader
          eyebrow="Learning"
          title="Popout workspace"
          description="Open the workspace on a second screen and continue learning hands-free."
        />
        <PopoutBody />
      </AppShell>
    </AuthGate>
  );
}

function PopoutBody() {
  const params = useSearchParams();
  const lessonId = params?.get("lessonId") ?? "";
  const panel = params?.get("panel") ?? "notes";
  const token = params?.get("token");
  const validation = useValidatePopoutToken(token);
  const [autoGranted, setAutoGranted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (lessonId && !token && !autoGranted) {
      // The page is opened without a token; treat as informational.
      setAutoGranted(true);
    }
  }, [lessonId, token, autoGranted]);

  if (!lessonId) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold">No lesson selected</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Open the popout window from a lesson to use this page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PopoutControls lessonId={lessonId} panel={panel} />

      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold">Session status</h3>
          <p className="text-sm text-muted-foreground">
            Token validity for the current popout window.
          </p>
        </CardHeader>
        <CardContent>
          {token ? (
            validation.isLoading ? (
              <LoadingState title="Validating token" />
            ) : validation.error ? (
              <ApiErrorState error={validation.error} />
            ) : validation.data ? (
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <StatusBadge tone="success" value="Valid" />
                </div>
                <p>Lesson: {validation.data.lessonId ?? lessonId}</p>
                {validation.data.expiresAt ? (
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(validation.data.expiresAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No validation result yet.</p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              Open the popout from a lesson to receive a token.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
