# Phase 01 Implementation Notes

Phase 01 adds the authentication and multi-tenant RBAC foundation.

## API

Auth endpoints:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/organizations`
- `POST /api/v1/auth/switch-organization`
- `POST /api/v1/auth/logout`

Tenant/RBAC proof endpoint:

- `GET /api/v1/organizations/:organizationId/members`

This endpoint requires:

- `Authorization: Bearer <accessToken>`
- active membership in `:organizationId`
- `memberships:manage` permission

## Security Behavior

- Passwords are hashed with bcrypt.
- Access tokens are short-lived JWTs.
- Refresh tokens are JWTs stored only as bcrypt hashes in `UserSession`.
- Refresh rotates the stored refresh token hash.
- Login, logout, registration, organization switching, and failed login attempts write audit logs.
- Suspended/deactivated memberships are blocked.
- Cross-tenant access is blocked by membership lookup using `organizationId + userId`.

## SSO Compatibility

Enterprise SSO is not implemented in this phase. The schema now includes SSO-compatible foundation tables:

- `SsoProvider`
- `UserIdentity`
- `OrganizationDomain`
- `OrganizationLoginPolicy`

Password auth uses `UserIdentity.providerType = PASSWORD`, keeping the identity model compatible with future SAML/OIDC providers.

## Local Verification

When Postgres runs through Compose on an alternate host port:

```powershell
$env:DATABASE_URL='postgresql://lms:lms_password@localhost:55432/lms?schema=public'
pnpm db:deploy
pnpm db:seed
pnpm typecheck
pnpm test
pnpm build
```
