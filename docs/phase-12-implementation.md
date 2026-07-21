# Phase 12 Implementation Notes

Phase 12 adds payment and marketplace-ready architecture with course pricing, coupons, orders, payment confirmation, subscription plans, and learner subscriptions.

## Database

Added payment and marketplace tables:

- `Coupon` - discount codes with type (percentage/fixed), amount, usage limits, and validity period
- `Order` - purchase orders with items, status, totals, and currency
- `OrderItem` - individual line items within an order (course enrollment)
- `Payment` - payment records with method, status, and transaction reference
- `SubscriptionPlan` - recurring subscription plan definitions with interval and pricing
- `UserSubscription` - learner subscription records with status and period

## Backend

Added `MarketplaceModule` with endpoints:

- `POST /api/v1/courses/:courseId/pricing` - set course price
- `POST /api/v1/coupons` - create coupon
- `GET /api/v1/coupons` - list coupons
- `POST /api/v1/coupons/validate` - validate a coupon code
- `POST /api/v1/orders` - create order (checkout)
- `GET /api/v1/orders/mine` - learner order history
- `GET /api/v1/orders/:id` - order detail
- `GET /api/v1/admin/orders` - admin order management
- `POST /api/v1/payments/confirm` - confirm payment
- `POST /api/v1/payments/approve` - approve payment (admin)
- `GET /api/v1/admin/payments` - admin payment list
- `POST /api/v1/subscription-plans` - create subscription plan
- `GET /api/v1/subscription-plans` - list plans
- `POST /api/v1/subscription-plans/:planId/subscribe` - subscribe to plan
- `GET /api/v1/subscriptions/mine` - learner subscriptions

Checkout creates an order with order items, handles coupon application, and creates enrollment on payment confirmation. Payment confirmation and admin approval are separate steps for manual/offline payment workflows.

## Frontend

Added UI pages:

- `/orders/new` - checkout page
- `/orders` - order history
- `/orders/[orderId]` - order detail
- `/subscriptions` - manage subscriptions
- `/admin/orders` - admin order management
- `/admin/payments` - admin payment management
- `/admin/coupons` - coupon management

## Security

- Order management requires learner context (own orders) or admin permissions.
- Coupon, pricing, and payment admin endpoints require marketplace management permissions.
- All data is organization-scoped.

## Verification

- `pnpm db:generate`
- `pnpm db:deploy`
- `pnpm db:seed`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Remaining Notes

- Payment provider abstraction exists; actual Stripe/Midtrans/Xendit integration requires provider-specific implementation.
- Subscription billing cycle automation and renewal handling deferred.
- Payout and revenue share features are Phase 29.
- Multi-currency and tax features are Phase 30.
