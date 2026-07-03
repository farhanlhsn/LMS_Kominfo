"use client";

import { LogIn } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { AuthShell } from "../../components/layout/shells";
import { api } from "../../lib/api-client";

const seededUsers = [
  { label: "Learner", email: "learner.one@example.com" },
  { label: "Instructor", email: "instructor@example.com" },
  { label: "Admin", email: "super.admin@example.com" },
];

export default function LoginPage() {
  const [email, setEmail] = useState(seededUsers[0]?.email ?? "");
  const [password, setPassword] = useState("ChangeMe123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.login(email, password);
      window.location.href = "/";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      description="Use a seeded account to enter the active organization."
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <label className="text-sm font-medium">
          Email
          <input
            className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label className="text-sm font-medium">
          Password
          <input
            className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
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
          <LogIn aria-hidden="true" className="h-4 w-4" />
          {loading ? "Signing in" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        Need a new workspace?{" "}
        <a className="font-semibold text-primary" href="/register">
          Create an account
        </a>
      </p>

      <div className="mt-5 grid gap-2">
        {seededUsers.map((user) => (
          <button
            key={user.email}
            className="rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => setEmail(user.email)}
            type="button"
          >
            <span className="font-semibold">{user.label}</span>
            <span className="ml-2 text-muted-foreground">{user.email}</span>
          </button>
        ))}
      </div>
    </AuthShell>
  );
}
