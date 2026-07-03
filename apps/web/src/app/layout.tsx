import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LMS Platform",
  description: "AI-powered, multi-tenant LMS foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
