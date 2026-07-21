# Codex Phase Prompt Template

Use this template when asking Codex to implement a phase.

```txt
Implement [PHASE NAME].

Before coding, read:
- AGENTS.md
- docs/README.md
- docs/phases/[PHASE FILE].md
- docs/[RELEVANT ARCHITECTURE DOC].md

Rules:
- Follow AGENTS.md strictly.
- Do not implement later phases except where required for extensibility.
- Keep the app buildable.
- Add/update migrations, seed, tests, and docs.
- Enforce RBAC and tenant isolation.

After implementation, summarize:
- files changed
- migrations added
- endpoints added
- tests added
- known limitations
- next recommended phase
```
