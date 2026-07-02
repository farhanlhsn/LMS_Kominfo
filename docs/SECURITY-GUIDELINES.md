# Security Guidelines

Kominfo AI Learning Management System

Version 1.0

---

## Purpose

Dokumen ini mendefinisikan standar keamanan wajib untuk AI-LMS. Semua kode yang di-merge harus patuh. Audit security dilakukan sebelum release ke production.

> **Aturan utama:** Validasi semua input. Jangan percaya data dari client. Jangan pernah hardcode secret. Log semua aksi sensitif.

---

## 1. Authentication

### 1.1 Password

| Aturan | Nilai |
|--------|-------|
| Minimum length | 8 karakter |
| Hash algorithm | bcrypt |
| Bcrypt rounds | 12 (configurable via `BCRYPT_ROUNDS`) |
| Password history | 5 password terakhir (opsional MVP) |
| Rate limit login | 5 percobaan / 15 menit per IP+email |

Password TIDAK boleh:

- Disimpan plain text
- Di-log dalam bentuk apapun
- Dimunculkan di response API
- Dikirim via email (reset pakai token, bukan password baru)

### 1.2 JWT

| Token | Expire | Storage |
|-------|--------|---------|
| Access Token | 15 menit | Client memory (bukan localStorage untuk MVP, httpOnly cookie lebih baik) |
| Refresh Token | 7 hari | Redis dengan blacklist + rotation |

Aturan:

- Access token dan refresh token pakai secret berbeda (`JWT_ACCESS_SECRET` vs `JWT_REFRESH_SECRET`)
- Secret minimal 64 karakter acak
- Refresh token di-rotate setiap dipakai (old token di-blacklist di Redis)
- Logout = blacklist refresh token + hapus access token dari client
- Token harus berisi `userId`, `role`, `regionId`, `iat`, `exp`
- Token TIDAK boleh berisi data sensitif (password hash, email, dll)

### 1.3 Login Flow

```
Client → POST /auth/login {email, password}
           ↓
Server validasi input
           ↓
Server rate limit check (Redis)
           ↓
Server find user by email
           ↓
Server compare bcrypt password
           ↓
Server generate access + refresh token
           ↓
Server blacklist check
           ↓
Server return { user, accessToken, refreshToken }
```

### 1.4 Refresh Flow

```
Client → POST /auth/refresh {refreshToken}
           ↓
Server verify signature + expiry
           ↓
Server check Redis blacklist
           ↓
Server blacklist old refresh token
           ↓
Server issue new access + refresh token
           ↓
Server return new tokens
```

### 1.5 Logout Flow

```
Client → POST /auth/logout
           ↓
Server blacklist current refresh token (TTL = sisa expire)
           ↓
Server return 200
           ↓
Client hapus token dari storage
```

### 1.6 Google OAuth (Future / Optional MVP)

Jika diaktifkan:

- Pakai OpenID Connect
- Verify `id_token` di server, jangan percaya client
- Link ke existing user by email, atau create new user
- Tetap issue JWT internal (jangan pakai Google token langsung)

---

## 2. Authorization (RBAC)

### 2.1 Roles

| Role | Scope | Keterangan |
|------|-------|------------|
| `STUDENT` | Own data | Akses pembelajaran |
| `INSTRUCTOR` | Own courses | Kelola materi yang dia buat |
| `REGIONAL_ADMIN` | Own region | Kelola region-nya saja |
| `SUPER_ADMIN` | Global | Akses penuh |

### 2.2 Permission Matrix

| Module | Student | Instructor | Regional Admin | Super Admin |
|--------|---------|------------|----------------|-------------|
| Course view | ✅ | ✅ | ✅ | ✅ |
| Course create | ❌ | ✅ (own) | ✅ (region) | ✅ |
| Course publish | ❌ | ❌ | ✅ (region) | ✅ |
| Quiz take | ✅ | ✅ | ✅ | ✅ |
| Quiz grade | ❌ | ✅ (own) | ✅ (region) | ✅ |
| AI chat | ✅ | ✅ | ✅ | ✅ |
| AI quiz generator | ❌ | ✅ | ✅ | ✅ |
| Assignment submit | ✅ | ❌ | ❌ | ❌ |
| Assignment grade | ❌ | ✅ (own) | ✅ (region) | ✅ |
| Certificate view (own) | ✅ | ✅ | ✅ | ✅ |
| Certificate manage | ❌ | ❌ | ✅ (region) | ✅ |
| Analytics view | ❌ | Limited | Regional | Global |
| User manage | ❌ | ❌ | ✅ (region) | ✅ |
| AI config | ❌ | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ❌ | ✅ |

### 2.3 Implementation

```ts
// Decorator
@Roles(Role.INSTRUCTOR, Role.REGIONAL_ADMIN)
@UseGuards(JwtGuard, RolesGuard)
@Post('courses')
createCourse() { ... }

// Guard
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const required = this.reflector.get<Role[]>('roles', ctx.getHandler());
    return required.some(r => req.user.role === r);
  }
}
```

### 2.4 Resource Ownership

Selain role check, cek ownership di service layer:

```ts
async updateCourse(courseId: string, user: User) {
  const course = await this.courseRepo.findById(courseId);
  if (!course) throw new NotFoundError();
  if (user.role === Role.INSTRUCTOR && course.instructorId !== user.id) {
    throw new ForbiddenError();
  }
  if (user.role === Role.REGIONAL_ADMIN && course.regionId !== user.regionId) {
    throw new ForbiddenError();
  }
  // SUPER_ADMIN lewat
}
```

> Jangan pernah percaya `userId` dari client body. Selalu ambil dari JWT yang sudah terverifikasi.

### 2.5 Region Isolation

Regional Admin hanya boleh akses data region-nya:

- Setiap query yang filter by region wajib pakai `user.regionId`
- Validasi di service layer, bukan hanya di controller
- Test khusus: regional admin Aceh TIDAK boleh read course Medan

---

## 3. Input Validation

### 3.1 Aturan

- Validasi SEMUA input: body, query, params, headers
- Pakai Zod schema di frontend & backend
- Backend wajib re-validasi (jangan percaya frontend)
- Reject input yang tidak sesuai schema
- Pesan error tidak boleh bocor struktur internal

### 3.2 Contoh

```ts
// Zod schema
const CreateCourseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  regionId: z.string().uuid(),
});

// Pipe
@UsePipes(new ZodValidationPipe(CreateCourseSchema))
@Post('courses')
createCourse(@Body() dto: CreateCourseDto) { ... }
```

### 3.3 Sanitization

| Input | Treatment |
|-------|-----------|
| Markdown content | Sanitize HTML, strip `<script>`, `onload`, `onerror` |
| Rich text | Allowlist tag (b, i, p, h1-h3, ul, ol, li, code, pre) |
| Filename upload | Generate random name, jangan pakai user filename |
| URL input | Validate scheme (http/https only), no SSRF (block localhost, 169.254.169.254) |
| Search query | Escape special char untuk FTS, limit length 100 |

---

## 4. File Upload Security

### 4.1 Validation

| Check | Aturan |
|-------|--------|
| MIME type | Verify dari magic bytes, bukan extension |
| Extension | Allowlist: pdf, docx, pptx, zip, png, jpg, webp, mp4 |
| Max size | 100MB (configurable) |
| Executable | Tolak: .exe, .bat, .sh, .js, .html (sebagai upload) |

### 4.2 Storage Flow

```
Client request presign URL
           ↓
Server validate user + quota
           ↓
Server generate signed URL (R2/MinIO)
           ↓
Client upload langsung ke storage (TIDAK lewat server)
           ↓
Client notify server upload complete
           ↓
Server verify file exists + size + MIME
           ↓
Server queue background job (virus scan, extract text, thumbnail)
```

> Untuk MVP, file tetap boleh lewat server jika ukuran kecil. Tapi untuk video & PDF besar, wajib presigned URL.

### 4.3 Filename

```ts
// JANGAN
const filename = req.file.originalname; // bisa ada ../ atau char aneh

// BENAR
const filename = `${randomUUID()}.${extension}`;
```

---

## 5. Rate Limiting

### 5.1 Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Anonymous (all) | 60 | per minute per IP |
| Authenticated (general) | 300 | per minute per user |
| AI endpoints | 30 | per minute per user |
| Admin endpoints | 600 | per minute per user |
| Login | 5 | per 15 minutes per IP+email |
| Register | 3 | per hour per IP |

### 5.2 Implementation

Pakai `@nestjs/throttler` dengan Redis storage untuk distributed rate limit:

```ts
// app.module.ts
ThrottlerModule.forRoot({
  throttlers: [
    { name: 'default', ttl: 60000, limit: 300 },
    { name: 'ai', ttl: 60000, limit: 30 },
  ],
  storage: new ThrottlerStorageRedis(new Redis(process.env.REDIS_URL)),
}),
```

```ts
@Throttle('ai') // pakai throttle bernama "ai"
@Post('ai/chat')
chat() { ... }
```

Response header wajib ada:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

Saat limit tercapai: return `429 Too Many Requests` dengan `Retry-After` header.

---

## 6. XSS & Injection Prevention

### 6.1 XSS

- Output encoding: render text sebagai text, bukan HTML
- Markdown render pakai library yang sanitize (mis. `marked` + `DOMPurify`)
- React auto-escape, jangan pakai `dangerouslySetInnerHTML` tanpa sanitize
- Content Security Policy header di production

CSP header:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.posthog.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://cdn.lms.go.id;
  connect-src 'self' https://api.lms.go.id https://app.posthog.com https://*.sentry.io;
  font-src 'self';
```

### 6.2 SQL Injection

- Selalu pakai Prisma parameterized query
- Jangan concat string SQL manual
- Jika terpaksa raw SQL, pakai `$queryRaw` dengan parameter:

```ts
// BENAR
await prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`;

// JANGAN
await prisma.$queryRaw(`SELECT * FROM users WHERE id = '${userId}'`);
```

### 6.3 NoSQL Injection

- Tidak pakai MongoDB, jadi N/A. Tapi tetap validasi tipe data input.

### 6.4 CSRF

- Untuk cookie-based auth, aktifkan CSRF token
- Untuk JWT di header (Bearer), CSRF tidak wajib tapi tetap validate `Origin`/`Referer` header
- Samesite cookie: `lax` atau `strict`

---

## 7. AI Security

### 7.1 Prompt Injection

Validasi input user sebelum masuk LLM:

- Tolak input yang mengandung: "ignore previous", "system prompt", "you are now", "forget instructions"
- Log percobaan prompt injection
- Setelah LLM response, validasi tidak ada bocoran system prompt

### 7.2 Data Boundary

- AI HANYA jawab dari konteks yang di-retrieve
- Jangan inject data user lain ke prompt
- Jangan inject API key, secret, atau metadata internal
- Regional Admin tidak bisa query AI dengan context region lain

### 7.3 Token Abuse

- Rate limit per user (30 req/min)
- Daily quota per user (100k token/day, configurable)
- Log semua token usage
- Alert jika spike abnormal

### 7.4 Moderation

- Panggil OpenAI moderation endpoint untuk setiap input
- Jika flagged: tolak, log, jangan simpan ke history
- Category yang ditolak: hate, violence, sexual, self-harm

### 7.5 Output Validation

- Validasi response format (JSON schema)
- Strip karakter yang bisa break UI
- Validasi citation ID exists di database
- Jangan render HTML mentah dari AI

---

## 8. Secrets Management

### 8.1 Aturan

- Secret TIDAK boleh di-commit (`.gitignore` wajib `.env`)
- Secret TIDAK boleh di-log
- Secret TIDAK boleh di response API
- Secret TIDAK boleh di error message yang dikirim ke client
- Pakai `.env.example` dengan placeholder

### 8.2 Storage

| Environment | Storage |
|-------------|---------|
| Local | `.env` file (gitignored) |
| CI/CD | GitHub Actions secrets |
| Staging/Prod | Platform secret manager (Railway/AWS Secrets Manager) |

### 8.3 Rotation

- JWT secret: rotate setiap 6 bulan
- OpenAI key: rotate jika ada indikasi leak
- R2 keys: rotate setiap 6 bulan

### 8.4 Leak Response

Jika secret bocor:

1. Revoke secret segera
2. Generate secret baru
3. Update semua environment
4. Audit log untuk penyalahgunaan
5. Document incident

---

## 9. Logging & Audit

### 9.1 Wajib Di-log

| Event | Level | Fields |
|-------|-------|--------|
| Login success | info | userId, ip, userAgent |
| Login failed | warn | email, ip, userAgent |
| Logout | info | userId |
| Password reset request | warn | email, ip |
| Password changed | info | userId |
| Role changed | warn | targetUserId, oldRole, newRole, byUserId |
| Course created/updated/deleted | info | courseId, userId |
| Lesson completed | info | userId, lessonId |
| Quiz submitted | info | userId, quizId, score |
| Assignment submitted | info | userId, assignmentId |
| Certificate generated | info | userId, courseId |
| AI chat | info | userId, promptId, tokenUsage |
| Failed permission access | warn | userId, resource, action |
| Rate limit hit | warn | ip, endpoint |
| File upload | info | userId, filename, size |
| Prompt injection attempt | error | userId, input (truncated) |

### 9.2 Dilarang Di-log

- Password (plain atau hash)
- JWT token
- API key
- Credit card number
- Full request body yang berisi password
- PII yang tidak perlu (NIP, no KTP kalau nanti ditambah)

### 9.3 Format

Pakai Pino structured JSON:

```json
{
  "level": "info",
  "time": 1719741600000,
  "event": "login_success",
  "userId": "uuid",
  "ip": "1.2.3.4",
  "userAgent": "Mozilla/..."
}
```

### 9.4 Retention

- Application log: 30 hari
- Audit log (user action): 1 tahun
- Security event: 2 tahun

---

## 10. HTTPS & Headers

### 10.1 HTTPS

- Wajib di staging & production
- TLS 1.2 minimum, 1.3 preferred
- HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Redirect HTTP → HTTPS

### 10.2 Security Headers

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `0` (deprecated, pakai CSP) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` |
| `Content-Security-Policy` | (lihat section 6.1) |

Pakai `helmet` di NestJS:

```ts
import helmet from 'helmet';
app.use(helmet());
```

---

## 11. Dependency Security

### 11.1 Scanning

- `pnpm audit` di CI (weekly)
- GitHub Dependabot: aktifkan untuk npm
- Snyk (opsional): scan setiap PR

### 11.2 Update Policy

- Patch version: auto-merge kalau test lulus
- Minor version: review manual
- Major version: schedule upgrade, test menyeluruh

### 11.3 Allowlist

- Hanya dependency yang dibutuhkan
- Review sebelum tambah dependency baru
- Cek license compatibility (MIT, Apache, BSD OK; GPL hati-hati untuk government)

---

## 12. GDPR / Privacy (Indonesia PDP Law)

### 12.1 Data yang Dikumpulkan

| Data | Tujuan | Retention |
|------|--------|-----------|
| Name, email | Identitas | Selama akun aktif |
| Password hash | Auth | Selama akun aktif |
| Learning progress | Service | Selama enrollment |
| Activity log | Analytics | 1 tahun |
| IP, user agent | Security | 30 hari |

### 12.2 User Rights

- Right to access: endpoint `GET /users/me`
- Right to rectification: endpoint `PATCH /users/me`
- Right to deletion: endpoint `DELETE /users/me` (soft delete dulu, hard delete setelah grace period)
- Data export: endpoint `GET /users/me/export` (JSON)

### 12.3 Implementation

- Soft delete user, jangan hard delete langsung
- Anonymize activity log setelah 1 tahun
- Data export dalam format machine-readable

---

## 13. Vulnerability Response

### 13.1 Severity

| Severity | Contoh | SLA Fix |
|----------|--------|---------|
| Critical | RCE, SQL injection, auth bypass | 24 jam |
| High | XSS stored, IDOR, privilege escalation | 72 jam |
| Medium | CSRF, info disclosure | 1 minggu |
| Low | Missing header, verbose error | 1 bulan |

### 13.2 Process

1. Konfirmasi vulnerability
2. Buat hotfix branch
3. Test fix
4. Deploy ke staging → verify
5. Deploy ke production
6. Post-mortem (untuk critical/high)
7. Tambah regression test

---

## Security Checklist (Pre-release)

Sebelum production release:

- [ ] Semua endpoint butuh auth (kecuali public: login, register, health)
- [ ] RBAC ter-implement di semua endpoint
- [ ] Region isolation ter-test
- [ ] Input validation di semua endpoint
- [ ] Rate limiting aktif
- [ ] File upload validation (MIME, size, extension)
- [ ] HTTPS + security headers
- [ ] Secret tidak ada di code
- [ ] Dependency audit bersih
- [ ] Logging audit lengkap
- [ ] AI guardrails aktif
- [ ] CSP header aktif
- [ ] Sentry menerima error
- [ ] Penetration test dasar (manual atau tool)

## References

- `MVP-TECH-STACK.md`
- `ENVIRONMENT-VARIABLES.md`
- `AGENTS.md.md`
- `DEFINITION-OF-DONE.md.md`
- `AI-PROMPT-TEMPLATES.md`
