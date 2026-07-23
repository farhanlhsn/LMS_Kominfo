"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { AuthShell } from "../../components/layout/shells";
import { api } from "../../lib/api-client";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const passwordsMatch = password === confirm;
    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired reset link");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="Invalid link" description="This reset link is missing a token.">
        <p className="text-sm text-muted-foreground">
          Please request a new{" "}
          <a href="/forgot-password" className="font-semibold text-primary hover:underline">
            password reset link
          </a>.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset password" description="Choose a new password for your account.">
      {done ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="text-sm text-muted-foreground">
            Your password has been reset. You can now sign in with your new password.
          </p>
          <a
            href="/login"
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Sign in
          </a>
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={onSubmit}>
          <label className="text-sm font-medium">
            New password
            <div className="relative mt-2">
              <input
                className="h-11 w-full rounded-md border border-input bg-card px-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          <label className="text-sm font-medium">
            Confirm password
            <input
              className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              type="password"
              required
              placeholder="Repeat new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            <KeyRound className="h-4 w-4" />
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
