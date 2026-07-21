# Phase 13 Implementation Notes

Phase 13 adds enterprise SSO, API key auth, webhook delivery, organization branding, domain verification, and login policy management.

## Database

New tables:

- `ApiKey` - API keys with hashed tokens, permissions, and expiry
- `WebhookEndpoint` - webhook URL, event types, and signing secret
- `WebhookDelivery` - delivery attempt log with status and response

Existing SSO foundation from Phase 01: `SsoProvider`, `OrganizationDomain`, `OrganizationLoginPolicy`.

## Backend

Added `EnterpriseModule` with endpoints:

Branding:

- `GET /api/v1/enterprise/branding`
- `PATCH /api/v1/enterprise/branding`

SSO Providers:

- `GET /api/v1/enterprise/sso-providers`
- `POST /api/v1/enterprise/sso-providers`
- `PATCH /api/v1/enterprise/sso-providers/:id`
- `DELETE /api/v1/enterprise/sso-providers/:id`

Login Policy:

- `GET /api/v1/enterprise/login-policy`
- `PATCH /api/v1/enterprise/login-policy`

Domains:

- `GET /api/v1/enterprise/domains`
- `POST /api/v1/enterprise/domains`
- `POST /api/v1/enterprise/domains/:id/verify`
- `DELETE /api/v1/enterprise/domains/:id`

API Keys:

- `POST /api/v1/enterprise/api-keys`
- `GET /api/v1/enterprise/api-keys`
- `POST /api/v1/enterprise/api-keys/:id/revoke`

Webhooks:

- `POST /api/v1/enterprise/webhooks`
- `GET /api/v1/enterprise/webhooks`
- `DELETE /api/v1/enterprise/webhooks/:id`
- `GET /api/v1/enterprise/webhooks/:endpointId/deliveries`

All enterprise endpoints require `enterprise:configure` permission and active organization context. Domain verification uses DNS TXT record checks. API key auth works alongside JWT auth for machine-to-machine access.

## Frontend

Added admin enterprise UI under `/admin/enterprise/`:

- `/admin/enterprise/branding` - organization branding settings
- `/admin/enterprise/sso` - SSO provider management
- `/admin/enterprise/domains` - domain management and verification
- `/admin/enterprise/login-policy` - login policy configuration
- `/admin/enterprise/api-keys` - API key management
- `/admin/enterprise/webhooks` - webhook endpoint management
- `/admin/enterprise/webhooks/[endpointId]/deliveries` - delivery log viewer

## Security

- Enterprise configuration requires `enterprise:configure` permission.
- API keys are hashed on storage; full key shown only on creation.
- Webhook signing uses HMAC-SHA256 with per-endpoint secrets.
- Audit logs are created for sensitive enterprise configuration changes.

## Verification

- `pnpm db:generate`
- `pnpm db:deploy`
- `pnpm db:seed`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Remaining Notes

- SAML/OIDC identity provider integration requires external IdP configuration at runtime.
- Automatic webhook retry with exponential backoff is not yet implemented.
- Domain verification DNS lookup is a placeholder; actual TXT record resolution deferred.
