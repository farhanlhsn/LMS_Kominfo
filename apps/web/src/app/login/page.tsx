"use client";

import { KeyRound, LogIn } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { AuthShell } from "../../components/layout/shells";
import { api } from "../../lib/api-client";

const seededUsers = [
  { label: "Learner", email: "learner.one@example.com" },
  { label: "Instructor", email: "instructor@example.com" },
  { label: "Admin", email: "super.admin@example.com" },
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
  callbackUrl?: string;
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
        if (active) {
          setSsoPolicy({
            allowSso: Boolean(policy?.allowSsoLogin),
            requireSsoForVerifiedDomains: Boolean(
              policy?.requireSsoForVerifiedDomains,
            ),
          });
        }
      } catch {
        if (active) setSsoPolicy(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ssoPolicy?.allowSso) {
      setSsoProvider(null);
      return;
    }
    const domain = emailDomain(email);
    if (!domain) {
      setSsoProvider(null);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const domains = (await api.domains()) as Array<{
          domain: string;
          verificationStatus: string;
          ssoProvider?: { id: string; name: string; type: string } | null;
        }>;
        const match = domains.find(
          (item) =>
            item.domain?.toLowerCase() === domain &&
            item.verificationStatus === "VERIFIED" &&
            Boolean(item.ssoProvider),
        );
        if (active) {
          if (match && match.ssoProvider) {
            setSsoProvider({
              id: match.ssoProvider.id,
              name: match.ssoProvider.name,
              type: match.ssoProvider.type,
              domain: match.domain,
            });
          } else {
            setSsoProvider(null);
          }
        }
      } catch {
        if (active) setSsoProvider(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [email, ssoPolicy?.allowSso]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ssoProvider && ssoPolicy?.requireSsoForVerifiedDomains) {
      window.location.href = `/api/v1/enterprise/sso/${encodeURIComponent(
        ssoProvider.id,
      )}/login?email=${encodeURIComponent(email)}`;
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

  async function startSso() {
    if (!ssoProvider) return;
    window.location.href = `/api/v1/enterprise/sso/${encodeURIComponent(
      ssoProvider.id,
    )}/login?email=${encodeURIComponent(email)}`;
  }

  return (
    <AuthShell
      title="Sign in"
      description="Use a seeded account or single sign-on to enter the active organization."
    >
      {ssoProvider ? (
        <section className="mb-4 rounded-lg border border-info/30 bg-info/5 p-4 text-sm text-foreground">
          <p className="font-semibold">
            <KeyRound aria-hidden="true" className="mr-2 inline h-4 w-4" />
            Single sign-on available
          </p>
          <p className="mt-1 text-muted-foreground">
            Your email matches verified domain{" "}
            <strong>{ssoProvider.domain}</strong> with provider{" "}
            <strong>{ssoProvider.name}</strong> ({ssoProvider.type}).
          </p>
          <button
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            onClick={startSso}
            type="button"
          >
            Continue with {ssoProvider.name}
          </button>
        </section>
      ) : null}

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

