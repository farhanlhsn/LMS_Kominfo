import { describe, expect, it, vi } from "vitest";
import {
  Judge0SandboxProvider,
  mapJudge0Result,
} from "./judge0-sandbox.provider";

describe("mapJudge0Result", () => {
  it("maps accepted", () => {
    const r = mapJudge0Result(
      { status: { id: 3 }, stdout: "ok\n", exit_code: 0 },
      12,
    );
    expect(r.status).toBe("COMPLETED");
    expect(r.stdout).toBe("ok\n");
  });

  it("maps time limit", () => {
    const r = mapJudge0Result({ status: { id: 5 } }, 100);
    expect(r.status).toBe("TIMED_OUT");
    expect(r.timedOut).toBe(true);
  });

  it("maps runtime error", () => {
    const r = mapJudge0Result(
      { status: { id: 11 }, stderr: "boom" },
      5,
    );
    expect(r.status).toBe("RUNTIME_ERROR");
    expect(r.stderr).toContain("boom");
  });
});

describe("Judge0SandboxProvider", () => {
  it("posts to Judge0 and maps response", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: { id: 3, description: "Accepted" },
        stdout: "hello",
        stderr: null,
        exit_code: 0,
      }),
    }));
    const provider = new Judge0SandboxProvider({
      baseUrl: "https://judge0.example",
      fetchFn: fetchFn as never,
    });
    const result = await provider.run({
      language: "PYTHON",
      code: "print(1)",
    });
    expect(result.status).toBe("COMPLETED");
    expect(result.stdout).toBe("hello");
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining("/submissions"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("errors when base URL missing", async () => {
    const provider = new Judge0SandboxProvider({ baseUrl: "" });
    const result = await provider.run({ language: "PYTHON", code: "x" });
    expect(result.status).toBe("ERROR");
    expect(result.stderr).toMatch(/JUDGE0_BASE_URL/);
  });

  it("rejects unsupported language and non-ok HTTP", async () => {
    const provider = new Judge0SandboxProvider({
      baseUrl: "https://judge0.example",
      fetchFn: vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => "down",
      })) as never,
    });
    const unsupported = await provider.run({
      language: "UNKNOWN" as any,
      code: "x",
    });
    expect(unsupported.status).toBe("ERROR");
    expect(unsupported.stderr).toMatch(/not supported/i);

    const failed = await provider.run({ language: "PYTHON", code: "print(1)" });
    expect(failed.status).toBe("ERROR");
  });

  it("maps compile error and network failure", async () => {
    const compiled = mapJudge0Result(
      { status: { id: 6 }, compile_output: "oops" },
      3,
    );
    expect(["ERROR", "COMPILE_ERROR", "RUNTIME_ERROR"]).toContain(
      compiled.status,
    );
    expect(compiled.stderr).toMatch(/oops/i);
    const provider = new Judge0SandboxProvider({
      baseUrl: "https://judge0.example",
      fetchFn: vi.fn(async () => {
        throw new Error("network");
      }) as never,
    });
    const result = await provider.run({ language: "JAVASCRIPT", code: "1" });
    expect(result.status).toBe("ERROR");
    expect(result.stderr).toMatch(/network/i);
  });
});
