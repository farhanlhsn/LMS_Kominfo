"use client";

import { useState } from "react";
import { useLocalePreference, useUpdateLocalePreference, useOrgLocalePreference } from "../../lib/api-hooks";
import { cn } from "../../lib/utils";

const COMMON_LOCALES = [
  { code: "en", label: "English" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
];

const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Jakarta",
  "Asia/Tokyo",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

export interface LocaleSwitcherProps {
  className?: string;
  showTimezone?: boolean;
  showFallbackChain?: boolean;
  variant?: "select" | "inline";
}

export function LocaleSwitcher({
  className,
  showTimezone = true,
  showFallbackChain = true,
  variant = "select",
}: LocaleSwitcherProps) {
  const preference = useLocalePreference();
  const org = useOrgLocalePreference();
  const update = useUpdateLocalePreference();
  const [status, setStatus] = useState<string | null>(null);

  const supportedLocales = Array.isArray(org.data?.supportedLocales)
    ? (org.data?.supportedLocales as string[])
    : [];
  const locales = supportedLocales.length
    ? COMMON_LOCALES.filter((locale) => supportedLocales.includes(locale.code))
    : COMMON_LOCALES;

  const handleLocaleChange = async (locale: string) => {
    setStatus(null);
    try {
      await update({ locale });
      setStatus("Saved");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const handleTimezoneChange = async (timezone: string) => {
    setStatus(null);
    try {
      await update({ timezone });
      setStatus("Saved");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  if (variant === "inline") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <p className="text-sm font-semibold">Language</p>
        <div className="flex flex-wrap gap-1">
          {locales.map((locale) => {
            const active = preference.data?.locale === locale.code;
            return (
              <button
                key={locale.code}
                type="button"
                onClick={() => handleLocaleChange(locale.code)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {locale.label}
              </button>
            );
          })}
        </div>
        {showTimezone && (
          <div className="mt-2">
            <p className="text-sm font-semibold">Timezone</p>
            <select
              aria-label="Timezone"
              value={preference.data?.timezone ?? "UTC"}
              onChange={(event) => handleTimezoneChange(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-card px-2 py-1 text-sm"
            >
              {COMMON_TIMEZONES.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </div>
        )}
        {status && <p className="text-xs text-muted-foreground">{status}</p>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="locale-select">
        Language
      </label>
      <select
        id="locale-select"
        value={preference.data?.locale ?? "en"}
        onChange={(event) => handleLocaleChange(event.target.value)}
        className="rounded-md border border-border bg-card px-3 py-2 text-sm"
      >
        {locales.map((locale) => (
          <option key={locale.code} value={locale.code}>
            {locale.label}
          </option>
        ))}
      </select>
      {showTimezone && (
        <>
          <label className="mt-2 text-xs font-semibold uppercase text-muted-foreground" htmlFor="timezone-select">
            Timezone
          </label>
          <select
            id="timezone-select"
            value={preference.data?.timezone ?? "UTC"}
            onChange={(event) => handleTimezoneChange(event.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            {COMMON_TIMEZONES.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
        </>
      )}
      {showFallbackChain && Array.isArray(preference.data?.fallbackChain) && (
        <p className="text-xs text-muted-foreground">
          Fallback: {(preference.data?.fallbackChain as string[]).join(" → ")}
        </p>
      )}
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
    </div>
  );
}
