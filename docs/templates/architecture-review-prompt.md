# Architecture Review Prompt

```txt
Review the current implementation architecture.

Audit:
1. Is the code modular and maintainable?
2. Does the database schema support future phases without major rewrite?
3. Is multi-tenancy consistently implemented?
4. Is RBAC consistently enforced?
5. Are APIs versioned and consistent?
6. Is storage abstracted properly?
7. Is AI architecture RAG-ready?
8. Is plugin architecture respected?
9. Is advanced learning workspace extensible?
10. Are analytics events recorded in important flows?
11. Are database indexes sufficient?
12. Are there hardcoded assumptions that block future features?
13. Are there N+1 query risks?
14. Are there missing tests for critical logic?
15. Are there security issues?

Output:
- issues found
- severity: low, medium, high
- recommended fix
- files to change
- whether the fix is required before next phase
```
