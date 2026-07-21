"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { AuthShell } from "../../components/layout/shells";
import { api } from "../../lib/api-client";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      await api.register({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        organizationName: String(form.get("organizationName") ?? ""),
        organizationSlug:
          String(form.get("organizationSlug") ?? "").trim() || undefined,
      });
      window.location.href = "/";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create account"
      description="Create a user and an organization workspace."
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <label className="text-sm font-medium">
          Name
          <input
            className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            name="name"
            type="text"
          />
        </label>
        <label className="text-sm font-medium">
          Email
          <input
            className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            name="email"
            required
            type="email"
          />
        </label>
        <label className="text-sm font-medium">
          Password
          <input
            className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>
        <label className="text-sm font-medium">
          Organization name
          <input
            className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            minLength={2}
            name="organizationName"
            required
            type="text"
          />
        </label>
        <label className="text-sm font-medium">
          Organization slug
          <input
            className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            name="organizationSlug"
            pattern="[a-z0-9-]+"
            type="text"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Lowercase letters, numbers, and hyphens.
          </span>
        </label>
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          <UserPlus aria-hidden="true" className="h-4 w-4" />
          {loading ? "Creating account" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        Already have an account?{" "}
        <a className="font-semibold text-primary" href="/login">
          Sign in
        </a>
      </p>
    </AuthShell>
  );
}
