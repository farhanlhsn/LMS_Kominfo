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

Use query params:

- `page`
- `limit`
- `sort`
- `search`

Response meta:

```json
{
  "page": 1,
  "limit": 20,
  "total": 100,
  "totalPages": 5
}
```

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
