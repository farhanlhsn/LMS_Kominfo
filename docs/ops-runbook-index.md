# Ops runbook index

| Topic | Doc |
|-------|-----|
| Deploy & image rollback | [ops-deploy-rollback.md](./ops-deploy-rollback.md) |
| TLS & backups | [ops-tls-backup.md](./ops-tls-backup.md) |
| Production env checklist | `apps/api/src/common/security/production-checklist.md` |
| API standards (pagination, errors) | [04-api-standards.md](./04-api-standards.md) |
| Architecture decisions | [01-architecture-decisions.md](./01-architecture-decisions.md) |
| Agent / product rules | `../AGENTS.md` |

## Quick health

```bash
curl -sS "$API/api/v1/health/live"
curl -sS "$API/api/v1/health"
# private network or METRICS_TOKEN:
curl -sS -H "x-metrics-token: $METRICS_TOKEN" "$API/api/v1/health/metrics"
```

## Smoke after deploy

1. Login as seed/admin (staging only)  
2. Catalog list + enroll  
3. Open one course learn path  
4. Confirm OpenAPI `/api/v1/docs` loads  
