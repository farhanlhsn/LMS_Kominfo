"use client";

import Editor from "@monaco-editor/react";
import { CheckCircle2,Play,Send,Terminal,XCircle } from "lucide-react";
import { useCallback,useState } from "react";
import { useExecuteCode } from "../../lib/api-hooks";
import type { CodeLanguage } from "../../lib/lms-types";
import { StatusBadge } from "../ui/core";

const LANGUAGES: { key: CodeLanguage; label: string; monacoId: string; starter: string }[] = [
  { key: "PYTHON",     label: "Python",     monacoId: "python",     starter: "# Write your Python code here\nprint('Hello, world!')\n" },
  { key: "JAVASCRIPT", label: "JavaScript", monacoId: "javascript", starter: "// Write your JavaScript code here\nconsole.log('Hello, world!');\n" },
  { key: "TYPESCRIPT", label: "TypeScript", monacoId: "typescript", starter: "// Write your TypeScript code here\nconst message: string = 'Hello, world!';\nconsole.log(message);\n" },
  { key: "GO",         label: "Go",         monacoId: "go",         starter: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, world!")\n}\n' },
  { key: "RUST",       label: "Rust",       monacoId: "rust",       starter: 'fn main() {\n    println!("Hello, world!");\n}\n' },
  { key: "JAVA",       label: "Java",       monacoId: "java",       starter: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}\n' },
  { key: "CPP",        label: "C++",        monacoId: "cpp",        starter: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, world!" << std::endl;\n    return 0;\n}\n' },
  { key: "RUBY",       label: "Ruby",       monacoId: "ruby",       starter: "# Write your Ruby code here\nputs 'Hello, world!'\n" },
  { key: "PHP",        label: "PHP",        monacoId: "php",        starter: "<?php\n// Write your PHP code here\necho 'Hello, world!';\n" },
];

const STATUS_TONE: Record<string, "success" | "danger" | "warning" | "neutral"> = {
  COMPLETED: "success",
  FAILED: "danger",
  TIMED_OUT: "danger",
  RUNTIME_ERROR: "danger",
  ERROR: "danger",
  RUNNING: "warning",
  PENDING: "neutral",
};

export interface CodeEditorProps {
  initialCode?: string;
  initialLanguage?: CodeLanguage;
  onCodeChange?: (code: string) => void;
  onLanguageChange?: (language: CodeLanguage) => void;
  onExecuted?: (result: { output: string | null; error: string | null }) => void;
  height?: number;
  readOnly?: boolean;
  lockedLanguage?: boolean;
}

export function CodeEditor({
  initialCode,
  initialLanguage = "PYTHON",
  onCodeChange,
  onLanguageChange,
  onExecuted,
  height = 340,
  readOnly = false,
  lockedLanguage = false,
}: CodeEditorProps) {
  const execute = useExecuteCode();
  const [language, setLanguage] = useState<CodeLanguage>(initialLanguage);
  const langMeta = LANGUAGES.find((l) => l.key === language) ?? LANGUAGES[0]!;
  const [code, setCode] = useState(initialCode ?? langMeta.starter);
  const [stdin, setStdin] = useState("");
  const [showStdin, setShowStdin] = useState(false);
  const [result, setResult] = useState<{ output: string | null; error: string | null; status: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLanguageChange = (key: CodeLanguage) => {
    const meta = LANGUAGES.find((l) => l.key === key) ?? LANGUAGES[0]!;
    setLanguage(key);
    setCode(meta.starter);
    onLanguageChange?.(key);
    setResult(null);
  };

  const handleRun = useCallback(async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await execute({ language, code, stdin: stdin || undefined });
      setResult({ output: res.output, error: res.error, status: res.status });
      onExecuted?.({ output: res.output, error: res.error });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Execution failed";
      const isNotInstalled = msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no such") || msg.toLowerCase().includes("command");
      setResult({
        output: null,
        error: isNotInstalled
          ? `${langMeta.label} runtime is not installed on this server. Ask your administrator to install it.`
          : msg,
        status: "ERROR",
      });
    } finally {
      setBusy(false);
    }
  }, [code, language, stdin, execute, langMeta.label, onExecuted]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-[#1e1e1e] shadow-lg">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#2d2d2d] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <select
            className="ml-2 rounded border border-white/20 bg-[#3c3c3c] px-2 py-0.5 text-xs font-medium text-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            value={language}
            disabled={lockedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value as CodeLanguage)}
            style={{ colorScheme: "dark" }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.key} value={l.key} style={{ backgroundColor: "#3c3c3c", color: "#fff" }}>{l.label}</option>
            ))}
          </select>
          {lockedLanguage && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/50">locked</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowStdin((v) => !v)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white/90"
          >
            <Terminal className="h-3 w-3" />
            stdin
          </button>
          <button
            type="button"
            onClick={handleRun}
            disabled={busy || readOnly}
            className="flex items-center gap-1.5 rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50"
          >
            <Play className="h-3 w-3" />
            {busy ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      {/* Monaco editor */}
      <Editor
        height={height}
        language={langMeta.monacoId}
        value={code}
        theme="vs-dark"
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          readOnly,
          tabSize: 2,
          wordWrap: "on",
          lineNumbers: "on",
          renderLineHighlight: "line",
          padding: { top: 8, bottom: 8 },
          fontFamily: "JetBrains Mono, Fira Code, monospace",
        }}
        onChange={(val) => {
          const v = val ?? "";
          setCode(v);
          onCodeChange?.(v);
        }}
      />

      {/* Stdin panel */}
      {showStdin && (
        <div className="border-t border-white/10 bg-[#252525] px-3 py-2">
          <p className="mb-1 text-xs text-white/50">Standard input (stdin)</p>
          <textarea
            className="w-full rounded bg-[#1e1e1e] px-2 py-1.5 font-mono text-xs text-white/80 focus:outline-none"
            rows={3}
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Enter program input here…"
          />
        </div>
      )}

      {/* Output panel */}
      {result && (
        <div className="border-t border-white/10 bg-[#1a1a1a]">
          <div className="flex items-center gap-2 border-b border-white/5 px-3 py-1.5">
            {result.error ? (
              <XCircle className="h-3.5 w-3.5 text-red-400" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            )}
            <span className="text-xs text-white/50">Output</span>
            {result.status && (
              <StatusBadge value={result.status} tone={STATUS_TONE[result.status] ?? "neutral"} />
            )}
          </div>
          {result.output && (
            <pre className="max-h-40 overflow-auto px-3 py-2 font-mono text-xs text-green-300">
              {result.output}
            </pre>
          )}
          {result.error && (
            <pre className="max-h-40 overflow-auto px-3 py-2 font-mono text-xs text-red-400">
              {result.error}
            </pre>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 border-t border-white/5 bg-[#2d2d2d] px-3 py-1.5 text-xs text-white/40">
        <Send className="h-3 w-3" />
        Executed in an isolated sandbox — no filesystem or network access
      </div>
    </div>
  );
}
