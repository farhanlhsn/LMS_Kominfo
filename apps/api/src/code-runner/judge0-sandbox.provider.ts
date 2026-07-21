import type {
  CodeLanguage,
  SandboxProvider,
  SandboxRunInput,
  SandboxRunResult,
} from "./sandbox.provider";

/** Judge0 CE language_id map — https://ce.judge0.com */
const JUDGE0_LANGUAGE_IDS: Partial<Record<CodeLanguage, number>> = {
  PYTHON: 71, // Python 3.8.1
  JAVASCRIPT: 63, // Node.js 12.14.0
  TYPESCRIPT: 74, // TypeScript 3.7.4
  GO: 60, // Go 1.13.5
  RUST: 73, // Rust 1.40.0
  JAVA: 62, // Java OpenJDK 13
  CPP: 54, // C++ GCC 9.2.0
  RUBY: 72, // Ruby 2.7.0
  PHP: 68, // PHP 7.4.1
};

type FetchLike = typeof fetch;

/**
 * Remote isolated runner via Judge0-compatible HTTP API.
 * Never executes user code on the API host.
 */
export class Judge0SandboxProvider implements SandboxProvider {
  readonly name = "judge0";
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetchFn: FetchLike;

  constructor(options?: {
    baseUrl?: string;
    apiKey?: string;
    fetchFn?: FetchLike;
  }) {
    this.baseUrl = (
      options?.baseUrl ??
      process.env.JUDGE0_BASE_URL ??
      ""
    ).replace(/\/+$/, "");
    this.apiKey = options?.apiKey ?? process.env.JUDGE0_API_KEY;
    this.fetchFn = options?.fetchFn ?? fetch;
  }

  async run(input: SandboxRunInput): Promise<SandboxRunResult> {
    if (!this.baseUrl) {
      return {
        status: "ERROR",
        stdout: "",
        stderr: "JUDGE0_BASE_URL is not configured",
        durationMs: 0,
        exitCode: null,
        signal: null,
        timedOut: false,
      };
    }

    const languageId = JUDGE0_LANGUAGE_IDS[input.language];
    if (!languageId) {
      return {
        status: "ERROR",
        stdout: "",
        stderr: `Language ${input.language} is not supported by Judge0 provider`,
        durationMs: 0,
        exitCode: null,
        signal: null,
        timedOut: false,
      };
    }

    const timeoutMs = Math.min(
      Math.max(input.timeoutMs ?? 5000, 1000),
      30_000,
    );
    const cpuTimeLimit = Math.ceil(timeoutMs / 1000);
    const start = Date.now();

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (this.apiKey) {
        headers["X-Auth-Token"] = this.apiKey;
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const createRes = await this.fetchFn(
        `${this.baseUrl}/submissions?base64_encoded=false&wait=true`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            source_code: input.code,
            language_id: languageId,
            stdin: input.stdin ?? "",
            cpu_time_limit: cpuTimeLimit,
            wall_time_limit: cpuTimeLimit + 2,
            memory_limit: (input.memoryLimitMb ?? 256) * 1024,
          }),
          signal: AbortSignal.timeout(timeoutMs + 10_000),
        },
      );

      if (!createRes.ok) {
        const text = await createRes.text();
        return {
          status: "ERROR",
          stdout: "",
          stderr: `Judge0 HTTP ${createRes.status}: ${text.slice(0, 500)}`,
          durationMs: Date.now() - start,
          exitCode: null,
          signal: null,
          timedOut: false,
        };
      }

      const body = (await createRes.json()) as {
        stdout?: string | null;
        stderr?: string | null;
        compile_output?: string | null;
        message?: string | null;
        status?: { id?: number; description?: string };
        time?: string | null;
        exit_code?: number | null;
      };

      return mapJudge0Result(body, Date.now() - start);
    } catch (err) {
      const timedOut =
        err instanceof Error &&
        (err.name === "TimeoutError" || /timeout|aborted/i.test(err.message));
      return {
        status: timedOut ? "TIMED_OUT" : "ERROR",
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
        exitCode: null,
        signal: null,
        timedOut,
      };
    }
  }
}

/** Judge0 status ids: 3 Accepted, 5 Time Limit, 6 Compilation Error, 7-12 runtime errors */
export function mapJudge0Result(
  body: {
    stdout?: string | null;
    stderr?: string | null;
    compile_output?: string | null;
    message?: string | null;
    status?: { id?: number; description?: string };
    exit_code?: number | null;
  },
  durationMs: number,
): SandboxRunResult {
  const statusId = body.status?.id ?? 0;
  const stdout = body.stdout ?? "";
  const stderr =
    [body.stderr, body.compile_output, body.message]
      .filter(Boolean)
      .join("\n") || "";

  if (statusId === 3) {
    return {
      status: "COMPLETED",
      stdout,
      stderr,
      durationMs,
      exitCode: body.exit_code ?? 0,
      signal: null,
      timedOut: false,
    };
  }
  if (statusId === 5) {
    return {
      status: "TIMED_OUT",
      stdout,
      stderr: stderr || "Time Limit Exceeded",
      durationMs,
      exitCode: body.exit_code ?? null,
      signal: null,
      timedOut: true,
    };
  }
  if (statusId === 6) {
    return {
      status: "ERROR",
      stdout,
      stderr: stderr || "Compilation Error",
      durationMs,
      exitCode: body.exit_code ?? 1,
      signal: null,
      timedOut: false,
    };
  }
  if (statusId >= 7 && statusId <= 12) {
    return {
      status: "RUNTIME_ERROR",
      stdout,
      stderr: stderr || body.status?.description || "Runtime Error",
      durationMs,
      exitCode: body.exit_code ?? 1,
      signal: null,
      timedOut: false,
    };
  }

  return {
    status: "ERROR",
    stdout,
    stderr: stderr || body.status?.description || `Judge0 status ${statusId}`,
    durationMs,
    exitCode: body.exit_code ?? null,
    signal: null,
    timedOut: false,
  };
}
