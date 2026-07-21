# Accessibility, Localization, and Timezone

## Accessibility

Design from the beginning with:

- keyboard navigation
- visible focus indicators
- semantic HTML
- ARIA labels only when needed
- sufficient color contrast
- accessible forms and errors
- screen-reader friendly dialogs
- captions and transcripts for media
- skip navigation links

## Localization

Support future multi-language UI:

- translation key structure
- language switcher placeholder
- user language preference
- organization default language
- course language metadata
- subtitle/caption language
- AI translate content placeholder

## Timezone

Store all datetimes in UTC. Use IANA timezone names.

Entities needing timezone awareness:

- User
- Organization
- Cohort
- LiveSession
- CalendarEvent
- Assignment due date
- Quiz availability
- Notification reminders
- Report date ranges

Display rules:

- Use user timezone first.
- Fallback to organization timezone.
- Fallback to UTC.
