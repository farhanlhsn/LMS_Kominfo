# API Standards

## Base URL

All APIs use `/api/v1`.

## Standard response

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

## Standard error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": []
  }
}
```

## Pagination

### Page mode (default for admin/catalog lists)

Query params:

- `page` (default `1`)
- `limit` (default `20`, max `100`)
- `sort`
- `search`

Response meta (`@lms/shared` `pageMeta`):

```json
{
  "page": 1,
  "limit": 20,
  "total": 100,
  "totalPages": 5
}
```

### Cursor mode (feeds / messages)

Query params:

- `cursor` (opaque ISO timestamp or id from previous page)
- `limit` (default `20`, max `100`)

Response meta (`@lms/shared` `cursorMeta`):

```json
{
  "limit": 20,
  "nextCursor": "2026-07-13T12:00:00.000Z",
  "hasMore": true
}
```

OpenAPI:

- Auto-generated from Nest controllers: `/api/v1/docs` and `/api/v1/docs-json` (`@nestjs/swagger`)
- Hand-maintained core paths (`buildOpenApiDocument`) are merged in for auth/payment notes
- Legacy: `/api/v1/openapi` redirects UI to `/api/v1/docs`

## Auth headers

```txt
Authorization: Bearer <accessToken>
x-organization-id: <active organization id>
```

## Tenant context

The API may resolve active organization from:

- `x-organization-id`
- route parameter
- server-side session
- token claim

Always validate membership before using organization context.

## Permission naming

Use `<module>:<action>` format:

- `courses:create`
- `courses:update`
- `courses:publish`
- `quiz:grade`
- `certificates:issue`
- `plugins:configure`

## Audit log requirement

Log sensitive actions:

- login success/failure
- organization changes
- membership changes
- role/permission changes
- SSO linking/provisioning
- course publish
- certificate issue/revoke
- payment/refund/payout
- plugin enable/disable/configure
