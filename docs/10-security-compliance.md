# Security, Compliance, and Governance

## Authentication and session

- Password hashing with argon2 or bcrypt
- Access token and refresh token
- Refresh token rotation
- Session revocation
- MFA with TOTP in security phase
- OAuth and enterprise SSO separated
- CAPTCHA for register, login abuse, and forgot password

## API security

- Rate limiting
- Helmet/security headers
- CORS configuration
- Request validation
- File upload validation
- Signed URLs for private files
- Audit log for sensitive actions

## Tenant security

- Always enforce `organizationId` context
- Check membership status
- Prevent cross-tenant access
- Never allow IdP mapping to platform super_admin

## Content security

- Sanitize rich text
- Validate file MIME type and extension
- Max file size rules
- Malware scanning provider placeholder
- Content moderation queue

## Legal and consent

- Terms of Service page
- Privacy Policy page
- Cookie consent banner
- Consent versioning
- ConsentRecord entity
- Re-accept terms when legal document version changes

## Data governance

- User data export
- User anonymization
- Data retention settings
- Archive policy
- Soft delete cleanup job
- Backup and restore documentation

## Accessibility

- WCAG-aware components
- Keyboard navigation
- Focus states
- ARIA labels
- Color contrast
- Screen-reader friendly forms
- Captions/transcripts for video

## Proctoring readiness

- ProctoringProvider abstraction
- Focus mode enforcement
- Tab switch detection
- Suspicious activity log
- Webcam/screen monitoring only via approved provider and explicit consent
