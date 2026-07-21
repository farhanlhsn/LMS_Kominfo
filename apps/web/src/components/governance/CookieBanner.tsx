"use client";

import { useCallback, useEffect, useState } from "react";
import { useRecordCookieConsent } from "../../lib/api-hooks";
import { Button } from "../ui/button";

const STORAGE_KEY = "lms.cookie.consent.v1";

type ConsentState = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

function generateSessionId(): string {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT);
  const [submitting, setSubmitting] = useState(false);
  const recordConsent = useRecordCookieConsent();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const persist = useCallback(
    async (value: ConsentState) => {
      setSubmitting(true);
      try {
        const sessionId =
          (typeof window !== "undefined" &&
            window.sessionStorage.getItem("lms.session.id")) ||
          generateSessionId();
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("lms.session.id", sessionId);
        }
        await recordConsent({
          ...value,
          sessionId,
        });
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        }
        setVisible(false);
      } catch (error) {
        console.error("Failed to record cookie consent", error);
      } finally {
        setSubmitting(false);
      }
    },
    [recordConsent],
  );

  const acceptAll = useCallback(() => {
    void persist({ necessary: true, analytics: true, marketing: true, preferences: true });
  }, [persist]);

  const rejectAll = useCallback(() => {
    void persist({ necessary: true, analytics: false, marketing: false, preferences: false });
  }, [persist]);

  const saveCustom = useCallback(() => {
    void persist(consent);
  }, [persist, consent]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:px-6"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">We use cookies</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We use essential cookies to make the platform work. With your consent we also use
            analytics and marketing cookies to improve the experience. You can change your
            preferences at any time on the privacy page.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked
              disabled
              aria-readonly
            />
            Necessary
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={consent.analytics}
              onChange={(event) =>
                setConsent((prev) => ({ ...prev, analytics: event.target.checked }))
              }
            />
            Analytics
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={consent.marketing}
              onChange={(event) =>
                setConsent((prev) => ({ ...prev, marketing: event.target.checked }))
              }
            />
            Marketing
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={consent.preferences}
              onChange={(event) =>
                setConsent((prev) => ({ ...prev, preferences: event.target.checked }))
              }
            />
            Preferences
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={acceptAll} disabled={submitting} size="sm">
            Accept all
          </Button>
          <Button onClick={rejectAll} disabled={submitting} variant="outline" size="sm">
            Reject all
          </Button>
          <Button onClick={saveCustom} disabled={submitting} variant="ghost" size="sm">
            Save preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
