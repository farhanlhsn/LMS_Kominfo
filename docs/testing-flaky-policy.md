# Flaky test quarantine policy

**Rule:** permanent `test.skip` / `it.skip` without an issue link is not allowed.

## When a test flakes

1. Open a GitHub issue titled `flaky: <suite> — <test name>`.
2. Comment in the test (or use `test.fix` with a clear message):

   ```ts
   // quarantine: https://github.com/<org>/<repo>/issues/<n> — remove by <YYYY-MM-DD>
   test.fix("…", async () => { /* … */ });
   ```

3. Deadline: **14 days** from quarantine. Re-fix, fix root cause, or delete the test if obsolete.
4. Prefer root-cause fix over quarantine (race, real timer, shared DB order).

## Known past flakes

| Test | Root cause | Fix |
|------|------------|-----|
| `sandbox.provider.spec.ts` › maps spawn errors | Fake child emitted before listeners attached | Wait for `listenerCount('close'\|'error')` before emit |

## CI

- Vitest: `forbidOnly: Boolean(process.env.CI)` — no `.only` in CI.
- Playwright: `forbidOnly` + `retries: 2` only on E2E (not unit/integration).
