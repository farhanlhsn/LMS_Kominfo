# Phase 14 Implementation Notes

Phase 14 adds PWA support, push notifications, performance hardening, signed URL hardening, and index optimization.

## Database

Added push notification table:

- `PushSubscription` - Web Push subscription data per user per organization

Index optimization migrations added composite indexes for common query patterns (enrollment lookups, activity progress, course listings, and audit log queries).

## Backend

Added `PushModule` with endpoints:

- `GET /api/v1/push/vapid` - get VAPID public key
- `GET /api/v1/push/subscriptions` - list push subscriptions
- `POST /api/v1/push/subscribe` - register push subscription
- `DELETE /api/v1/push/unsubscribe` - remove push subscription
- `POST /api/v1/push/send/:userId` - send push notification (admin/instructor)

## Frontend

- PWA manifest and service worker registration added.
- Push notification prompt and subscription management in notification settings.
- Security headers and cache control improvements for API responses.

## Security

- Signed URL generation is hardened with path validation and expiry enforcement.
- File access policy prevents path traversal and cross-tenant file access.
- Push subscriptions are scoped per user and organization.

## Verification

- `pnpm db:generate`
- `pnpm db:deploy`
- `pnpm db:seed`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Remaining Notes

- Actual Web Push delivery requires VAPID keys configured in environment and a push service.
- Service worker caching strategy is basic; fine-tuning for offline support deferred.
- Full PWA audit (lighthouse, offline support, install prompt) is part of Phase 37.
