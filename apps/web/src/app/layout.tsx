import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaOverlay } from "../components/pwa/pwa-overlay";
import { ThemeModeProvider, themeModeBootstrapScript } from "../components/theme/theme-mode";
import { CookieBanner } from "../components/governance/CookieBanner";
import { AuthProvider } from "../lib/auth";
import { QueryProvider } from "../providers/query-provider";

const serviceWorkerScript =
  process.env.NODE_ENV === "production"
    ? `
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
          navigator.serviceWorker.register("/sw.js").catch(() => undefined);
        });
      }
    `
    : `
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations()
          .then((registrations) => {
            registrations.forEach((registration) => registration.unregister());
          })
          .catch(() => undefined);
      }
      if ("caches" in window) {
        caches.keys()
          .then((keys) => {
            keys
              .filter((key) => key.startsWith("lms-"))
              .forEach((key) => caches.delete(key));
          })
          .catch(() => undefined);
      }
    `;

export const metadata: Metadata = {
  title: "LMS Platform",
  description: "AI-powered, multi-tenant LMS foundation",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LMS",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f766e" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: themeModeBootstrapScript,
          }}
        />
      </head>
      <body>
        <ThemeModeProvider>
          <QueryProvider>
            <AuthProvider>
              {children}
              <CookieBanner />
              <PwaOverlay />
            </AuthProvider>
          </QueryProvider>
        </ThemeModeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: serviceWorkerScript,
          }}
        />
      </body>
    </html>
  );
}
