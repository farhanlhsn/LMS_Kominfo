import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// CRITICAL: User-generated code MUST NEVER execute in the main API process.
// The sandbox provider spawns a separate child process with strict isolation
// (no network, hard timeout, no eval) and captures stdout/stderr.

export const SANDBOX_PROVIDER = Symbol.for("lms.code_runner.sandbox.provider");

export type CodeLanguage =
  | "PYTHON"
  | "JAVASCRIPT"
  | "TYPESCRIPT"
  | "GO"
  | "RUST"
  | "JAVA"
  | "CPP"
  | "RUBY"
  | "PHP";

export const SUPPORTED_LANGUAGES: ReadonlyArray<CodeLanguage> = [
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

export type SandboxRunInput = {
  language: CodeLanguage;
  code: string;
  stdin?: string;
  timeoutMs?: number;
  memoryLimitMb?: number;
};

export type SandboxRunResult = {
  status: "COMPLETED" | "TIMED_OUT" | "ERROR" | "RUNTIME_ERROR";
  stdout: string;
  stderr: string;
  durationMs: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
};

export type SpawnFn = (
  command: string,
  args: string[],
  options: Parameters<typeof spawn>[2],
) => ChildProcessWithoutNullStreams;

export interface SandboxProvider {
  readonly name: string;
  run(input: SandboxRunInput): Promise<SandboxRunResult>;
}

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 64 * 1024;

type RunnerSpec = {
  command: string;
  args: (file: string) => string[];
  extension: string;
  needsCompile?: boolean;
  compileCommand?: (file: string) => string[];
};

const RUNNER_TABLE: Record<CodeLanguage, RunnerSpec> = {
  PYTHON: { command: "python3", args: (f) => [f], extension: "py" },
  JAVASCRIPT: { command: "node", args: (f) => [f], extension: "js" },
  TYPESCRIPT: {
    command: "node",
    args: (f) => ["--experimental-strip-types", f],
    extension: "ts",
  },
  GO: { command: "go", args: (f) => ["run", f], extension: "go" },
  RUBY: { command: "ruby", args: (f) => [f], extension: "rb" },
  PHP: { command: "php", args: (f) => [f], extension: "php" },
  // Compiled languages use a single-step compile+run via shim scripts in this
  // mock implementation; production should use a hardened container runner.
  RUST: { command: "sh", args: (f) => ["-c", `rustc ${f} -o /tmp/runner-out 2>/dev/null && /tmp/runner-out`], extension: "rs" },
  JAVA: { command: "sh", args: (f) => ["-c", `javac ${f} -d /tmp 2>/dev/null && java -cp /tmp Main`], extension: "java" },
  CPP: { command: "sh", args: (f) => ["-c", `g++ ${f} -O2 -o /tmp/cpp-out 2>/dev/null && /tmp/cpp-out`], extension: "cpp" },
};

function clampTimeout(value: number | undefined): number {
  if (!value || Number.isNaN(value) || value <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(value, MAX_TIMEOUT_MS);
}

export function truncate(buffer: string, maxBytes: number): string {
  if (buffer.length <= maxBytes) return buffer;
  return buffer.slice(0, maxBytes) + "\n...truncated...";
}

export class MockSandboxProvider implements SandboxProvider {
  readonly name = "mock-isolated-runner";
  private readonly spawnFn: SpawnFn;

  constructor(spawnFn?: SpawnFn) {
    this.spawnFn = spawnFn ?? (spawn as unknown as SpawnFn);
  }

  async run(input: SandboxRunInput): Promise<SandboxRunResult> {
    // Host spawn is dev/test only — never run user code on the API process in prod.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "MockSandboxProvider is disabled in production; configure an isolated sandbox worker",
      );
    }

    const spec = RUNNER_TABLE[input.language];
    const timeoutMs = clampTimeout(input.timeoutMs);
    const start = Date.now();
    const workdir = await mkdtemp(join(tmpdir(), "lms-sandbox-"));
    const file = join(workdir, `main.${spec.extension}`);
    const stdinPayload = input.stdin ?? "";

    try {
      // Path is generated inside a fresh OS temp directory above.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await writeFile(file, input.code, "utf8");
      const result = await this.spawnIsolated(spec, file, stdinPayload, timeoutMs);
      const durationMs = Date.now() - start;
      const stdout = truncate(result.stdout, MAX_OUTPUT_BYTES);
      const stderr = truncate(result.stderr, MAX_OUTPUT_BYTES);
      if (result.errored) {
        return {
          status: "ERROR",
          stdout,
          stderr,
          durationMs,
          exitCode: result.exitCode,
          signal: result.signal,
          timedOut: false,
        };
      }
      if (result.timedOut) {
        return {
          status: "TIMED_OUT",
          stdout,
          stderr,
          durationMs,
          exitCode: result.exitCode,
          signal: result.signal,
          timedOut: true,
        };
      }
      if (result.exitCode === 0) {
        return {
          status: "COMPLETED",
          stdout,
          stderr,
          durationMs,
          exitCode: 0,
          signal: null,
          timedOut: false,
        };
      }
      return {
        status: "RUNTIME_ERROR",
        stdout,
        stderr,
        durationMs,
        exitCode: result.exitCode,
        signal: result.signal,
        timedOut: false,
      };
    } catch (err) {
      return {
        status: "ERROR",
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
        exitCode: null,
        signal: null,
        timedOut: false,
      };
    } finally {
      try {
        await rm(workdir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }

  spawnIsolated(
    spec: RunnerSpec,
    file: string,
    stdinPayload: string,
    timeoutMs: number,
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    timedOut: boolean;
    errored?: boolean;
  }> {
    return new Promise((resolve) => {
      const args = spec.args(file);
      const child = this.spawnFn(spec.command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          PATH: process.env.PATH ?? "",
          NODE_OPTIONS: "--no-deprecation",
        },
        detached: false,
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore
        }
      }, timeoutMs);

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: stderr || (err instanceof Error ? err.message : String(err)),
          exitCode: -1,
          signal: null,
          timedOut,
          errored: true as const,
        });
      });

      child.on("close", (code, signal) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: code,
          signal: signal as NodeJS.Signals | null,
          timedOut,
        });
      });

      if (stdinPayload) {
        child.stdin.write(stdinPayload);
      }
      child.stdin.end();
    });
  }
}
