"use client";

import { useCallback, useEffect, useState } from "react";
import { useEnrollMfa, useVerifyMfa, useDisableMfa, useMfaFactors } from "../../lib/api-hooks";
import { Button } from "../ui/button";
import { Card, CardHeader, CardContent } from "../ui/card";
import type { MfaEnrollmentChallenge, MfaFactorType } from "../../lib/lms-types";

interface MfaSetupWizardProps {
  onComplete?: (type: MfaFactorType) => void;
}

export function MfaSetupWizard({ onComplete }: MfaSetupWizardProps) {
  const { data: factors = [] } = useMfaFactors();
  const enroll = useEnrollMfa();
  const verify = useVerifyMfa();
  const disable = useDisableMfa();
  const [challenge, setChallenge] = useState<MfaEnrollmentChallenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const startEnrollment = useCallback(
    async (type: MfaFactorType) => {
      setError(null);
      setBusy(true);
      try {
        const { data } = await enroll(type);
        setChallenge(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start MFA enrollment");
      } finally {
        setBusy(false);
      }
    },
    [enroll],
  );

  const handleVerify = useCallback(async () => {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await verify(code);
      if (data.valid) {
        setSuccessMessage(
          data.type === "BACKUP_CODE"
            ? `Verified. ${data.remainingCodes ?? 0} backup codes remaining.`
            : "Authenticator app verified successfully.",
        );
        onComplete?.(data.type);
        setChallenge(null);
        setCode("");
      } else {
        setError("Verification failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }, [challenge, code, verify, onComplete]);

  const handleDisable = useCallback(
    async (type: MfaFactorType) => {
      setBusy(true);
      setError(null);
      try {
        await disable(type);
        setSuccessMessage(`${type} factor removed`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not disable MFA");
      } finally {
        setBusy(false);
      }
    },
    [disable],
  );

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Multi-factor authentication</h2>
        <p className="text-sm text-muted-foreground">
          Add an extra layer of security to your account. You can use an authenticator app
          (TOTP) or one-time backup codes.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        ) : null}
        {successMessage ? (
          <div className="rounded border border-emerald-400/30 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
            {successMessage}
          </div>
        ) : null}
        {(factors ?? []).length === 0 && !challenge ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void startEnrollment("TOTP")} disabled={busy}>
              Enroll authenticator app
            </Button>
            <Button onClick={() => void startEnrollment("BACKUP_CODE")} variant="outline" disabled={busy}>
              Generate backup codes
            </Button>
          </div>
        ) : null}
        {challenge ? (
          <div className="space-y-3">
            {challenge.type === "TOTP" ? (
              <>
                <p className="text-sm">
                  Scan the QR code or paste the secret into your authenticator app.
                </p>
                {challenge.otpauthUrl ? (
                  <p className="break-all rounded bg-muted px-2 py-1 text-xs font-mono">
                    {challenge.otpauthUrl}
                  </p>
                ) : null}
                {challenge.secret ? (
                  <p className="break-all rounded bg-muted px-2 py-1 text-sm font-mono">
                    Secret: {challenge.secret}
                  </p>
                ) : null}
                <label className="block text-sm font-medium">
                  Enter the 6-digit code
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className="mt-1 w-full rounded border border-border px-3 py-2"
                  />
                </label>
                <Button onClick={handleVerify} disabled={busy || code.length === 0}>
                  Verify
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm">Save these backup codes somewhere safe:</p>
                <ul className="grid grid-cols-2 gap-2 text-sm font-mono">
                  {challenge.codes?.map((c) => (
                    <li key={c} className="rounded bg-muted px-2 py-1">
                      {c}
                    </li>
                  ))}
                </ul>
                <label className="block text-sm font-medium">
                  Confirm a code to finish setup
                  <input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className="mt-1 w-full rounded border border-border px-3 py-2"
                  />
                </label>
                <Button onClick={handleVerify} disabled={busy || code.length === 0}>
                  Confirm
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setChallenge(null)}>
              Cancel
            </Button>
          </div>
        ) : null}
        {(factors ?? []).length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Active factors</h3>
            <ul className="space-y-1 text-sm">
              {(factors ?? []).map((factor) => (
                <li key={factor.id} className="flex items-center justify-between rounded border border-border px-3 py-2">
                  <div>
                    <span className="font-medium">{factor.type}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {factor.verifiedAt ? `Verified ${factor.verifiedAt}` : "Pending verification"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDisable(factor.type)}
                    disabled={busy}
                  >
                    Disable
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
