"use client";

import { useCallback, useState } from "react";
import { Play, Send } from "lucide-react";
import { useExecuteCode } from "../../lib/api-hooks";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { StatusBadge } from "../ui/core";
import type { CodeLanguage } from "../../lib/lms-types";

const LANGUAGES: CodeLanguage[] = [
  "PYTHON",
  "JAVASCRIPT",
  "TYPESCRIPT",
  "GO",
  "RUST",
  "JAVA",
  "CPP",
  "RUBY",
  "PHP",
];

export interface CodeEditorProps {
  initialCode?: string;
  initialLanguage?: CodeLanguage;
  onCodeChange?: (code: string) => void;
  onLanguageChange?: (language: CodeLanguage) => void;
  onExecuted?: (result: { output: string | null; error: string | null }) => void;
}

export function CodeEditor({
  initialCode = "",
  initialLanguage = "PYTHON",
  onCodeChange,
  onLanguageChange,
  onExecuted,
}: CodeEditorProps) {
  const execute = useExecuteCode();
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState<CodeLanguage>(initialLanguage);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleRun = useCallback(async () => {
    setBusy(true);
    setError(null);
    setStatus("Running...");
    setOutput(null);
    try {
      const result = await execute({
        language,
        code,
        stdin: stdin || undefined,
      });
      setOutput(result.output);
      setError(result.error);
      setStatus(result.status);
      onExecuted?.({ output: result.output, error: result.error });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute code");
      setStatus("ERROR");
    } finally {
      setBusy(false);
    }
  }, [code, language, stdin, execute, onExecuted]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Code runner</h3>
          <select
            className="rounded border border-border px-2 py-1 text-sm"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value as CodeLanguage);
              onLanguageChange?.(e.target.value as CodeLanguage);
            }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          aria-label="Source code"
          className="min-h-48 w-full rounded-md border border-border bg-card p-3 font-mono text-sm"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            onCodeChange?.(e.target.value);
          }}
          spellCheck={false}
        />
        <label className="block text-sm">
          Standard input (optional)
          <textarea
            className="mt-1 w-full rounded border border-border px-2 py-1 text-sm"
            rows={3}
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
          />
        </label>
        <div className="flex items-center gap-2">
          <Button onClick={handleRun} disabled={busy}>
            <Play className="mr-2 h-4 w-4" /> {busy ? "Running..." : "Run code"}
          </Button>
          {status ? <StatusBadge value={status} tone={error ? "danger" : "success"} /> : null}
        </div>
        {output ? (
          <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
            {output}
          </pre>
        ) : null}
        {error ? (
          <pre className="max-h-48 overflow-auto rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
          </pre>
        ) : null}
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Send className="h-3 w-3" /> Code is executed in a sandboxed runner.
        </p>
      </CardContent>
    </Card>
  );
}
