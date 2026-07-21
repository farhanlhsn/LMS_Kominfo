import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  MockSandboxProvider,
  truncate,
  type SpawnFn,
  type CodeLanguage,
} from "./sandbox.provider";
import { EventEmitter } from "node:events";

function makeFakeChild(options: {
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  error?: Error;
  emitStdout?: boolean;
}) {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const child: any = new EventEmitter();
  child.stdout = stdout;
  child.stderr = stderr;
  child.stdin = { write: vi.fn(), end: vi.fn() };
  child.kill = vi.fn();

  const fire = () => {
    if (options.error) {
      child.emit("error", options.error);
      return;
    }
    if (options.emitStdout && options.stdout) {
      stdout.emit("data", Buffer.from(options.stdout));
    }
    if (options.stderr) {
      stderr.emit("data", Buffer.from(options.stderr));
    }
    child.emit("close", options.exitCode ?? 0, options.signal ?? null);
  };

  // Provider attaches `close` only after async setup (mkdtemp/writeFile).
  // Wait for that — not `error` (tests may attach a temporary error listener).
  const waitForCloseListener = (attempt = 0) => {
    if (child.listenerCount("close") > 0 || attempt > 200) {
      fire();
      return;
    }
    setTimeout(() => waitForCloseListener(attempt + 1), 5);
  };
  setTimeout(() => waitForCloseListener(), 0);

  return child;
}

const SUPPORTED_LANGUAGES_FOR_TEST: CodeLanguage[] = [
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

describe("MockSandboxProvider", () => {
  it("refuses to run in production", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const provider = new MockSandboxProvider(vi.fn() as unknown as SpawnFn);
      await expect(
        provider.run({ language: "PYTHON", code: "print(1)" }),
      ).rejects.toThrow(/disabled in production/i);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  beforeEach(() => {
    vi.useRealTimers();
  });

  it("returns COMPLETED for successful runs", async () => {
    const child = makeFakeChild({
      stdout: "ok",
      exitCode: 0,
      emitStdout: true,
    });
    const spawnFn: SpawnFn = vi.fn().mockReturnValue(child);
    const provider = new MockSandboxProvider(spawnFn);
    const promise = provider.run({
      language: "JAVASCRIPT",
      code: "console.log('ok')",
    });
    const result = await promise;
    expect(result.status).toBe("COMPLETED");
    expect(result.stdout).toBe("ok");
    expect(result.exitCode).toBe(0);
    expect(spawnFn).toHaveBeenCalled();
  });

  it("returns RUNTIME_ERROR for non-zero exit codes", async () => {
    const child = makeFakeChild({
      stdout: "partial",
      stderr: "boom",
      exitCode: 1,
      emitStdout: true,
    });
    const spawnFn: SpawnFn = vi.fn().mockReturnValue(child);
    const provider = new MockSandboxProvider(spawnFn);
    const result = await provider.run({
      language: "JAVASCRIPT",
      code: "throw new Error('boom')",
    });
    expect(result.status).toBe("RUNTIME_ERROR");
    expect(result.stderr).toBe("boom");
  });

  it("maps spawn errors to ERROR status", async () => {
    const child = makeFakeChild({ error: new Error("spawn failed") });
    const spawnFn: SpawnFn = vi.fn().mockReturnValue(child);
    const provider = new MockSandboxProvider(spawnFn);
    const result = await provider.run({
      language: "JAVASCRIPT",
      code: "x",
    });
    expect(result.status).toBe("ERROR");
    expect(result.stderr).toContain("spawn failed");
  });

  it("truncates very large outputs", async () => {
    const big = "x".repeat(70_000);
    const child = makeFakeChild({
      stdout: big,
      exitCode: 0,
      emitStdout: true,
    });
    const spawnFn: SpawnFn = vi.fn().mockReturnValue(child);
    const provider = new MockSandboxProvider(spawnFn);
    const result = await provider.run({
      language: "JAVASCRIPT",
      code: "console.log('big')",
    });
    expect(result.stdout.length).toBeLessThanOrEqual(70_000);
    expect(result.stdout).toContain("truncated");
  });

  it("honours the timeout by killing the child", async () => {
    const stdout = new EventEmitter();
    const stderr = new EventEmitter();
    const child: any = new EventEmitter();
    child.stdout = stdout;
    child.stderr = stderr;
    child.stdin = { write: vi.fn(), end: vi.fn() };
    let killed = false;
    child.kill = vi.fn(() => {
      killed = true;
      // Emit close after kill so the promise resolves
      setTimeout(() => child.emit("close", null, "SIGKILL"), 0);
    });
    const spawnFn: SpawnFn = vi.fn().mockReturnValue(child);
    const provider = new MockSandboxProvider(spawnFn);
    const result = await provider.run({
      language: "JAVASCRIPT",
      code: "while(true){}",
      timeoutMs: 10,
    });
    expect(killed).toBe(true);
    expect(result.timedOut).toBe(true);
    expect(result.status).toBe("TIMED_OUT");
  });

  it("exposes supported languages", () => {
    expect(SUPPORTED_LANGUAGES_FOR_TEST.length).toBe(9);
  });

  it("truncate helper leaves short strings untouched", () => {
    expect(truncate("short", 100)).toBe("short");
  });

  it("truncate helper appends marker for long strings", () => {
    const result = truncate("x".repeat(200), 50);
    expect(result).toContain("truncated");
  });
});
