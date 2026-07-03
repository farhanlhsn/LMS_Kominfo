# Realtime and Notification Architecture

## Realtime strategy

Use REST for normal operations. Use realtime only when it improves UX:

- AI streaming response
- in-app notifications
- live discussion replies
- direct messaging
- live session status
- pop-out workspace sync if server-side sync is needed

## Options

- Server-Sent Events for one-way streams
- WebSocket for bidirectional realtime
- Redis pub/sub for horizontal scaling
- BroadcastChannel for browser same-user multi-window sync

## Notifications

Channels:

- IN_APP
- EMAIL
- WEB_PUSH
- WHATSAPP_PROVIDER optional

Phase requirement:

- Implement in-app notifications first.
- Implement Web Push in PWA phase.
- Keep WhatsApp as provider adapter until selected.

## Triggers

- New course announcement
- Discussion reply
- Accepted answer
- Assignment due reminder
- Quiz reminder
- Live session reminder
- Certificate issued
- AI generated item approved/rejected
- Payment event
- Payout event

## Data model

Notification:

- organizationId nullable
- userId
- type
- title
- message
- actionUrl nullable
- readAt nullable
- metadata

NotificationPreference:

- userId
- channel
- type
- enabled
