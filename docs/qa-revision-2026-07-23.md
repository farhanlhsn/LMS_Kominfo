# QA Revision - 2026-07-23

This revision addresses cross-phase production QA findings without changing tenant isolation or permission boundaries.

## Behavior changes

- Cookie consent is persisted locally before audit synchronization. API failure no longer reopens the banner.
- PWA install dismissal is remembered for 30 days. Accepted installation is also persisted.
- Wishlist state is loaded from server data and resynchronized after navigation or refresh.
- Ended or cancelled live classes cannot be joined from live-class or calendar views. API enforcement remains authoritative.
- Personal calendar entries use `PERSONAL_EVENT` or `PERSONAL_REMINDER`, have no course association, and do not notify course learners.
- Learning-path enrollment is idempotent and UI now shows existing enrollment plus API errors.
- Weekly and monthly leaderboards aggregate XP earned inside selected period instead of depending on optional snapshots.
- Platform and organization administrators land in appropriate management workspace after login or organization switch.
- Course builder navigation remains visible on gradebook and roster pages.
- Content-library items can be edited. File links are refreshed through LMS API rather than persisted MinIO URLs.
- Enterprise API keys and webhook secrets are displayed once after creation.
- SSO provider types and webhook event names are normalized before persistence.

## File delivery

Public file URL:

```text
/api/v1/files/public/:fileId
```

Private file URL:

```text
/api/v1/files/content/:fileId?expires=...&token=...
```

Private URLs are HMAC-signed and short-lived. Clients must request a fresh signed URL before opening private content. Configure `FILE_URL_SIGNING_SECRET`; API falls back to required JWT access secret when omitted.

## Enterprise secrets

Set `ENTERPRISE_SECRET_KEY` in production for independent encryption-key rotation. Existing deployments may use required `JWT_ACCESS_SECRET` as fallback. SSO client secrets and webhook signing secrets are encrypted before database persistence.

## Operator glossary

### Verified domains and SSO

Domain configuration maps email domains to auto-join and SSO policy. SSO provider configuration contains identity-provider connection details. Domain verification in current release is administrator-confirmed; production owners should verify DNS ownership operationally before enabling auto-join or enforced SSO.

### xAPI

xAPI stores interoperable learning statements such as actor, verb, and activity. Use it for external learning tools, offline activity, and Learning Record Store integrations. Normal LMS course progress does not require direct xAPI administration.

### Cohorts

Cohorts group learners into scheduled course runs. Create cohort, select course from managed-course list, set capacity and dates, then assign learners through cohort management APIs or later roster workflows.

### Bulk operations

Bulk operations enqueue auditable background jobs. Choose supported operation, provide real entity IDs, submit, then monitor item-level status. Do not use placeholder IDs.

### Certificate templates

Templates control reusable certificate presentation. Current editor supports heading and accent color with preview; issued PDF uses stored design values.

### Plugins and marketplace

Installed plugin configuration is JSON validated against plugin config schema. Marketplace listing controls discovery metadata such as name and description. Runtime plugin code and activity behavior remain package-owned; listing customization does not rewrite package implementation.
