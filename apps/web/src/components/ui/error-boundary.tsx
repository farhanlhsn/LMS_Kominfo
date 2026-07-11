"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

function generateRefCode(error: Error) {
  const hash = Array.from(error.message)
    .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffffff, 0)
    .toString(16)
    .toUpperCase()
    .padStart(8, "0");
  return `ERR-${hash}`;
}

interface State {
  error: Error | null;
  refCode: string | null;
}

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, refCode: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, refCode: generateRefCode(error) };
  }

  override componentDidCatch(error: Error) {
    // Log to console for developer debug only — not shown to user
    console.error("[ErrorBoundary]", error);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-warning/30 bg-warning/5 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-warning" />
          <div>
            <p className="text-sm font-semibold">{this.props.fallbackTitle ?? "Something went wrong"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This section could not be loaded. If the issue persists, contact support with reference code:
            </p>
          </div>
          <code className="rounded-md border border-border bg-muted px-3 py-1.5 font-mono text-xs font-semibold tracking-wider">
            {this.state.refCode}
          </code>
          <button
            type="button"
            onClick={() => this.setState({ error: null, refCode: null })}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
