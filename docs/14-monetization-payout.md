# Monetization, Marketplace, Payout, and Multi-Currency

## Marketplace features

- free course
- paid course
- bundle
- subscription
- coupon
- refund
- invoice
- organization billing

## Multi-currency

Products, orders, payments, refunds, and payouts must store currency explicitly.

Fields:

- price
- currency
- exchangeRate nullable
- taxAmount
- total

## Payment provider abstraction

PaymentProvider:

- createPayment
- verifyPayment
- handleWebhook
- refundPayment

Providers:

- ManualPaymentProvider for MVP
- Midtrans/Xendit/Stripe-ready adapters

## Instructor payout

Data model:

InstructorRevenueShare:

- organizationId
- courseId
- instructorId
- percentage
- status

InstructorPayoutAccount:

- instructorId
- provider
- accountDataEncrypted
- status

InstructorPayout:

- organizationId
- instructorId
- amount
- currency
- status
- periodStart
- periodEnd

PayoutTransaction:

- payoutId
- orderId nullable
- refundId nullable
- amount
- currency
- type: CREDIT, DEBIT, ADJUSTMENT

## Rules

- Platform fee must be configurable.
- Refund must adjust instructor payout.
- Payout should be approved by finance admin.
- All payout actions must be audited.
