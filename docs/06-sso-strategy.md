# Multi-Organization SSO Strategy

## Core principle

- User is global.
- Organization membership is tenant-scoped.
- SSO provider is organization-scoped.
- Role and permission are resolved from active organization membership.
- A user may belong to multiple organizations and may authenticate with different providers for different organizations.

Do not implement SSO as a single global enterprise login button only. Resolve organization context before starting enterprise SSO.

## Login modes

1. Global login with email discovery
2. Organization-first login via `/o/:organizationSlug/login`
3. Subdomain or custom domain login
4. Invite-based login
5. IdP-initiated SSO with signed RelayState
6. Public social login, separate from enterprise SSO

## Public social login

- Google personal/public login
- Microsoft personal/public login
- Optional GitHub login
- Authenticates the global user account
- Must not automatically add user to an organization unless valid invite or organization policy allows it

## Enterprise SSO

- Organization-scoped
- Supports SAML and OIDC
- Organizations may configure one or more SSO providers
- Organizations may enforce SSO for verified domains
- Organizations may enable/disable JIT provisioning
- Organizations may map IdP groups to LMS organization roles
- Enterprise SSO must never assign platform `super_admin`

## Data model

SsoProvider:

- id
- organizationId
- type: SAML, OIDC, GOOGLE_WORKSPACE, MICROSOFT_ENTRA
- name
- issuer
- entityId nullable
- clientId nullable
- clientSecretEncrypted nullable
- metadataUrl nullable
- metadataXml nullable
- authorizationUrl nullable
- tokenUrl nullable
- userInfoUrl nullable
- callbackUrl
- enabled
- jitProvisioningEnabled
- inviteOnly
- defaultRoleId nullable
- groupRoleMappings JSON nullable
- config JSON

UserIdentity:

- id
- userId
- organizationId nullable
- providerType: PASSWORD, GOOGLE, MICROSOFT, SAML, OIDC
- ssoProviderId nullable
- providerSubject
- providerEmail
- providerEmailVerified
- rawProfile JSON
- lastLoginAt

OrganizationDomain:

- id
- organizationId
- domain
- verificationStatus: PENDING, VERIFIED, REJECTED
- verifiedAt nullable
- ssoProviderId nullable
- enforceSso boolean
- autoJoinEnabled boolean

OrganizationLoginPolicy:

- id
- organizationId
- allowPasswordLogin
- allowSocialLogin
- allowSsoLogin
- requireSsoForVerifiedDomains
- jitProvisioningEnabled
- inviteOnly
- mfaRequired
- sessionTtlMinutes

## SSO callback flow

1. Validate state, nonce, PKCE, issuer, audience, signature, and callback URL.
2. Resolve SsoProvider and Organization from signed state or RelayState.
3. Read stable provider subject from IdP.
4. Find UserIdentity by `ssoProviderId + providerSubject`.
5. If identity does not exist:
   - If JIT provisioning is enabled, create or link user safely.
   - If invite-only is enabled, require valid invitation.
   - If domain auto-join is enabled, require verified organization domain.
   - Otherwise reject login.
6. Create or update OrganizationMember.
7. Apply default role or group-to-role mapping.
8. Reject access if membership is suspended, deactivated, or organization is disabled.
9. Set session `activeOrganizationId`.
10. Issue token for active organization context.

## Account linking rules

Do not link SSO identity to existing user only because email matches. Link automatically only if:

- IdP email is verified
- organization domain is verified
- organization policy allows auto-linking

Otherwise require the user to authenticate with existing account before linking.

## Endpoints

- `POST /api/v1/auth/discovery`
- `GET /api/v1/auth/sso/:organizationSlug/:providerId/start`
- `GET /api/v1/auth/sso/:providerId/callback`
- `POST /api/v1/auth/sso/saml/:providerId/acs`
- `POST /api/v1/auth/sso/idp-initiated`
- `GET /api/v1/auth/organizations`
- `POST /api/v1/auth/switch-organization`
- `GET /api/v1/admin/sso-providers`
- `POST /api/v1/admin/sso-providers`
- `PATCH /api/v1/admin/sso-providers/:id`
- `DELETE /api/v1/admin/sso-providers/:id`
- `POST /api/v1/admin/sso-providers/:id/test`
- `GET /api/v1/admin/organization-domains`
- `POST /api/v1/admin/organization-domains`
- `POST /api/v1/admin/organization-domains/:id/verify`
- `GET /api/v1/admin/login-policy`
- `PATCH /api/v1/admin/login-policy`

## Security requirements

- Use signed and expiring state/RelayState.
- Use nonce and PKCE for OIDC.
- Validate SAML signatures and metadata.
- Validate issuer and audience.
- Require verified email for auto-linking.
- Require verified domains for domain-based auto-join.
- Never allow cross-tenant data access.
- Never allow IdP group mapping to platform super_admin.
- Log all SSO login attempts, failures, linking, provisioning, and role mapping changes.
