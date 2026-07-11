"use client";

import { KeyRound, LogIn, BookOpen, GraduationCap, BarChart3, Users } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { AuthShell } from "../../components/layout/shells";
import { api } from "../../lib/api-client";

const seededUsers = [
  { label: "Learner", email: "learner.one@example.com" },
  { label: "Instructor", email: "instructor@example.com" },
  { label: "Admin", email: "super.admin@example.com" },
];

const features = [
  { icon: BookOpen, title: "Rich Course Library", desc: "Access hundreds of courses across all domains" },
  { icon: GraduationCap, title: "Track Your Progress", desc: "Monitor learning milestones and achievements" },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Deep insights for instructors and admins" },
  { icon: Users, title: "Collaborative Learning", desc: "Discuss, share, and grow with your peers" },
];

function emailDomain(value: string): string | null {
  const at = value.indexOf("@");
  if (at < 0) return null;
  const domain = value.slice(at + 1).trim().toLowerCase();
  return domain.length > 0 ? domain : null;
}

interface SsoProviderView {
  id: string;
  name: string;
  type: string;
  domain: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState(seededUsers[0]?.email ?? "");
  const [password, setPassword] = useState("ChangeMe123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ssoProvider, setSsoProvider] = useState<SsoProviderView | null>(null);
  const [ssoPolicy, setSsoPolicy] = useState<{ allowSso: boolean; requireSsoForVerifiedDomains: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const policy = await api.getLoginPolicy();
        if (active) setSsoPolicy({ allowSso: Boolean(policy?.allowSsoLogin), requireSsoForVerifiedDomains: Boolean(policy?.requireSsoForVerifiedDomains) });
      } catch {
        if (active) setSsoPolicy(null);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ssoPolicy?.allowSso) { setSsoProvider(null); return; }
    const domain = emailDomain(email);
    if (!domain) { setSsoProvider(null); return; }
    let active = true;
    void (async () => {
      try {
        const domains = (await api.domains()) as Array<{ domain: string; verificationStatus: string; ssoProvider?: { id: string; name: string; type: string } | null }>;
        const match = domains.find((item) => item.domain?.toLowerCase() === domain && item.verificationStatus === "VERIFIED" && Boolean(item.ssoProvider));
        if (active) setSsoProvider(match?.ssoProvider ? { id: match.ssoProvider.id, name: match.ssoProvider.name, type: match.ssoProvider.type, domain: match.domain } : null);
      } catch {
        if (active) setSsoProvider(null);
      }
    })();
    return () => { active = false; };
  }, [email, ssoPolicy?.allowSso]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ssoProvider && ssoPolicy?.requireSsoForVerifiedDomains) {
      window.location.href = `/api/v1/enterprise/sso/${encodeURIComponent(ssoProvider.id)}/login?email=${encodeURIComponent(email)}`;
      return;
    }
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
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">LMS Platform</span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight">
              Learn, grow, and<br />achieve more.
            </h1>
            <p className="mt-4 text-primary-foreground/70 text-lg">
              A modern learning management system built for teams, institutions, and individuals.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl bg-primary-foreground/10 p-4">
                <Icon className="h-6 w-6 mb-2 text-primary-foreground/80" />
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-primary-foreground/60 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-primary-foreground/40 text-xs">
          © {new Date().getFullYear()} LMS Platform. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">LMS Platform</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue</p>

          {ssoProvider && (
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Single sign-on available
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Domain <strong>{ssoProvider.domain}</strong> uses <strong>{ssoProvider.name}</strong> ({ssoProvider.type})
              </p>
              <button
                className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                onClick={() => { window.location.href = `/api/v1/enterprise/sso/${encodeURIComponent(ssoProvider.id)}/login?email=${encodeURIComponent(email)}`; }}
                type="button"
              >
                Continue with {ssoProvider.name}
              </button>
            </div>
          )}

          <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
            <label className="text-sm font-medium">
              Email
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="text-sm font-medium">
              <div className="flex items-center justify-between">
                Password
                <a href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
                placeholder="••••••••"
                required
              />
            </label>
            {error && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}
            <button
              className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <a className="font-semibold text-primary hover:underline" href="/register">
              Create one
            </a>
          </p>

          {/* Quick fill buttons */}
          <div className="mt-8 rounded-xl border border-border bg-muted/40 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick sign in (demo)</p>
            <div className="grid gap-2">
              {seededUsers.map((user) => (
                <button
                  key={user.email}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left text-sm hover:bg-muted hover:border-primary/30 transition"
                  onClick={() => setEmail(user.email)}
                  type="button"
                >
                  <span className="font-semibold">{user.label}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
