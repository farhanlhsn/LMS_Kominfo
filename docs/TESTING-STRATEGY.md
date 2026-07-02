# Testing Strategy

Kominfo AI Learning Management System

Version 1.0

---

## Purpose

Dokumen ini mendefinisikan pendekatan testing untuk AI-LMS. Tujuannya: setiap fitur yang dideploy sudah teruji, regression tertangkap otomatis, dan confidence untuk release tinggi.

> **Aturan wajib:** Tidak ada PR yang boleh merge tanpa test yang relevant lulus. "Relevant" berarti test yang menyentuh kode yang diubah.

---

## Testing Pyramid

```
        E2E (sedikit, critical path)
       ─────────────────────────
      Integration (sedang, API + DB)
     ────────────────────────────────
    Unit (banyak, cepat, isolated)
```

Prioritas dari bawah: unit test paling banyak dan paling cepat. E2E paling sedikit, hanya untuk alur kritis.

---

## Coverage Targets

| Layer | Target |
|-------|--------|
| Overall | >= 80% |
| Core modules (auth, course, quiz, assignment, certificate, ai) | >= 90% |
| Utilities & helpers | >= 80% |
| UI components | >= 70% (komponen kompleks wajib, trivial opsional) |

Coverage diukur per service, bukan global. Coverage 100% tidak menjamin bebas bug - kualitas test lebih penting daripada angka.

---

## Tools

### Backend (NestJS)

| Tool | Purpose |
|------|---------|
| Jest | Test runner |
| Supertest | HTTP integration test |
| @nestjs/testing | Test module setup |
| testcontainers | PostgreSQL + Redis real container untuk integration |
| nock / msw | Mock external API (OpenAI, R2) |

### Frontend (Next.js)

| Tool | Purpose |
|------|---------|
| Vitest | Test runner (lebih cepat dari Jest untuk ESM) |
| @testing-library/react | Component test |
| @testing-library/user-event | User interaction simulation |
| MSW (Mock Service Worker) | Mock API di level network |
| Playwright | E2E |

### Monorepo

| Tool | Purpose |
|------|---------|
| Turborepo (opsional) | Cache dan parallel test runner |
| pnpm | Workspace orchestration |

---

## Test Structure

```
apps/api/
├── src/
│   ├── modules/
│   │   ├── course/
│   │   │   ├── course.service.ts
│   │   │   ├── course.service.spec.ts        # Unit test
│   │   │   ├── course.controller.ts
│   │   │   ├── course.controller.spec.ts     # Unit test
│   │   │   └── course.controller.e2e-spec.ts # Integration (Supertest)
│   │   └── ...
│   └── ...
├── test/
│   ├── fixtures/                              # Shared test data
│   │   ├── users.ts
│   │   ├── courses.ts
│   │   └── quizzes.ts
│   ├── helpers/                               # Test helpers
│   │   ├── db.helper.ts                       # Setup/teardown DB
│   │   ├── redis.helper.ts                    # Setup/teardown Redis
│   │   └── auth.helper.ts                     # Generate JWT untuk test
│   └── jest-e2e.config.ts

apps/web/
├── src/
│   ├── components/
│   │   ├── course/
│   │   │   ├── CourseCard.tsx
│   │   │   └── CourseCard.test.tsx            # Component test
│   ├── hooks/
│   │   ├── useCourses.ts
│   │   └── useCourses.test.ts                 # Hook test
├── tests/
│   ├── e2e/
│   │   ├── auth.spec.ts
│   │   ├── learn.spec.ts
│   │   └── quiz.spec.ts
│   ├── fixtures/
│   └── playwright.config.ts
```

Aturan naming:

- Unit: `*.spec.ts`
- Integration: `*.e2e-spec.ts` (backend) atau `*.integration.test.ts`
- E2E (Playwright): `*.spec.ts` di folder `tests/e2e/`

---

## Unit Testing

### Backend - Service Layer

Service adalah tempat bisnis logic. Wajib di-test.

Prinsip:

- Mock repository & external dependencies
- Test behavior, bukan implementation detail
- Test happy path, edge case, dan error case
- Satu test = satu assertion konsep (boleh multiple expect yang berkaitan)

Contoh:

```ts
describe('CourseService', () => {
  let service: CourseService;
  let courseRepo: jest.Mocked<CourseRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: 'CourseRepository', useValue: createMock<CourseRepository>() },
      ],
    }).compile();

    service = module.get(CourseService);
    courseRepo = module.get('CourseRepository');
  });

  describe('createCourse', () => {
    it('should create course with valid input', async () => {
      courseRepo.create.mockResolvedValue(mockCourse);
      const result = await service.createCourse(validInput);
      expect(result).toEqual(mockCourse);
      expect(courseRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        title: validInput.title,
      }));
    });

    it('should throw when instructor does not exist', async () => {
      courseRepo.findInstructor.mockResolvedValue(null);
      await expect(service.createCourse(validInput)).rejects.toThrow(NotFoundError);
    });

    it('should throw when slug already exists', async () => { ... });
  });
});
```

### Backend - Controller

Controller test fokus pada:

- Input validation
- Authorization (role check)
- Memanggil service dengan parameter benar
- Response format

Mock service, jangan panggil service asli.

```ts
describe('CourseController', () => {
  it('should return 201 on valid create', async () => {
    courseService.create.mockResolvedValue(mockCourse);
    const res = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should return 403 when student creates course', async () => { ... });
  it('should return 422 on invalid payload', async () => { ... });
});
```

### Frontend - Component

Test komponen dengan Testing Library. Fokus pada interaksi user, bukan struktur DOM.

```tsx
describe('CourseCard', () => {
  it('should render course info', () => {
    render(<CourseCard course={mockCourse} />);
    expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
    expect(screen.getByText(mockCourse.instructor)).toBeInTheDocument();
  });

  it('should call onView when clicked', async () => {
    const onView = vi.fn();
    render(<CourseCard course={mockCourse} onView={onView} />);
    await userEvent.click(screen.getByRole('button', { name: /view/i }));
    expect(onView).toHaveBeenCalledWith(mockCourse.id);
  });

  it('should show progress when enrolled', () => { ... });
  it('should show loading skeleton', () => { ... });
});
```

---

## Integration Testing

Integration test memvalidasi kombinasi: Controller + Service + Repository + Database.

### Setup

Pakai testcontainers untuk PostgreSQL + Redis real:

```ts
// test/helpers/db.helper.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

let pgContainer, redisContainer;

beforeAll(async () => {
  pgContainer = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
  redisContainer = await new RedisContainer().start();
  process.env.DATABASE_URL = pgContainer.getConnectionUri();
  process.env.REDIS_URL = redisContainer.getConnectionUrl();
  await runMigrations();
});

afterAll(async () => {
  await pgContainer.stop();
  await redisContainer.stop();
});
```

> Alternatif: pakai DB dev yang dedicated untuk test dengan `DATABASE_URL` berbeda. Lebih cepat, tapi testcontainers lebih reliable di CI.

### Yang Di-test

| Area | Contoh |
|------|--------|
| Auth flow | Register → login → refresh token → logout |
| Course CRUD | Create → list → get → update → delete |
| Enrollment | Enroll → progress update → complete |
| Quiz submission | Start → submit → score calculation → leaderboard update |
| Assignment | Submit → grade → feedback |
| Certificate | Complete all lessons → auto-generate certificate |
| AI chat | Question → retrieval → LLM mock → response with citation |

### External Mock

OpenAI dan R2 di-mock di integration test:

```ts
// Mock OpenAI
nock('https://api.openai.com')
  .post('/v1/chat/completions')
  .reply(200, { choices: [{ message: { content: 'mock answer' } }] });

// Mock R2 dengan MinIO container atau mock SDK
```

---

## E2E Testing (Playwright)

E2E hanya untuk alur kritis. Tujuannya: pastikan user bisa menyelesaikan perjalanan utama.

### Critical Paths Wajib

| Path | Scenario |
|------|----------|
| Auth | Login → dashboard → logout |
| Learning | Dashboard → course → lesson → mark complete |
| Quiz | Start quiz → answer all → submit → see result |
| Assignment | Open assignment → upload file → see submission status |
| AI Tutor | Open lesson → ask AI → get answer with citation |
| Certificate | Complete course → see certificate → download |

### Playwright Config

```ts
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
```

> Mobile project wajib karena mobile-first adalah requirement.

### E2E Principles

- Buat data lewat API (test fixtures), bukan lewat UI form
- Bersihkan data setelah suite, bukan setiap test (cepat)
- Test satu alur per file
- Jangan test hal yang sudah di-cover unit test

---

## Test Data & Fixtures

### Factory Pattern

Gunakan factory untuk generate test data yang konsisten:

```ts
// test/fixtures/courses.ts
export const courseFactory = {
  build(overrides: Partial<Course> = {}): Course {
    return {
      id: randomUUID(),
      title: 'Test Course',
      slug: 'test-course',
      instructorId: overrides.instructorId ?? randomUUID(),
      regionId: overrides.regionId ?? 'aceh',
      status: 'draft',
      ...overrides,
    };
  },
};
```

### Seed untuk Test

Database seed test terpisah dari seed dev:

```bash
pnpm --filter @lms/database seed:test   # Data minimal untuk test
pnpm --filter @lms/database seed:dev    # Data lengkap untuk dev manual
```

Data test harus deterministic. Jangan pakai `Math.random()` di factory tanpa seed.

---

## Performance Testing

### Backend

| Metric | Target |
|--------|--------|
| P95 response time (non-AI) | < 200ms |
| P95 response time (AI first token) | < 2s |
| Database query (single) | < 50ms |

Tools: `autocannon` atau `k6` untuk load test manual. CI tidak wajib jalankan load test.

### Frontend

| Metric | Target |
|--------|--------|
| Lighthouse Performance | >= 95 |
| LCP | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |

Lighthouse CI dijalankan per build untuk halaman utama.

---

## CI/CD Integration

### Pipeline Stages

```
1. lint        (ESLint, Prettier check)
2. typecheck   (tsc --noEmit)
3. unit        (Jest backend + Vitest frontend)
4. integration (Jest e2e-spec dengan testcontainers)
5. build       (Next.js build + NestJS build)
6. e2e         (Playwright, hanya pada PR ke main)
7. lighthouse  (hanya pada PR ke main)
```

### Parallelization

- Unit test: parallel per file (default Jest/Vitest)
- Integration: serial (shared DB) atau paralel dengan schema isolation
- E2E: parallel per browser project

### Fail Fast

- Lint dan typecheck pertama, fail = skip sisanya
- Jika unit test fail, skip integration & E2E

### Coverage Report

Generate coverage report setiap CI run. Upload sebagai artifact. PR comment menampilkan delta coverage.

---

## Test Rules

### Wajib

- Setiap service method publik wajib ada unit test
- Setiap API endpoint wajib ada integration test
- Setiap critical path wajib ada E2E
- Test harus deterministik (tidak flaky)
- Test harus cepat (unit < 10s total, integration < 60s, E2E < 5 menit)
- Mock external API (OpenAI, R2, email) di semua level kecuali E2E yang memang butuh

### Dilarang

- Test yang bergantung pada urutan eksekusi
- Test yang pakai `setTimeout` untuk menunggu (pakai `waitFor`)
- Test dengan data production
- Skip test tanpa alasan dan tiket tracking
- Snapshot test untuk hal yang bukan UI statis (rawan false positive)
- Test yang hanya assert "tidak error"

### Anti-flaky

Jika test flaky:

1. Isolasi penyebab (timing, shared state, network)
2. Tambah wait explicit (bukan sleep)
3. Bersihkan state antar test
4. Jika tetap flaky, tandai `@flaky` dengan tiket untuk diperbaiki

---

## Definition of Done (Testing)

Sebuah fitur dianggap test-complete jika:

- [ ] Unit test untuk service & controller
- [ ] Integration test untuk endpoint
- [ ] Component test untuk UI baru
- [ ] E2E jika menyentuh critical path
- [ ] Coverage target tercapai untuk file yang diubah
- [ ] Tidak ada flaky test
- [ ] CI pipeline lulus
- [ ] Edge case ter-cover (empty, error, permission)

---

## Commands

```bash
# Backend
pnpm --filter @lms/api test               # Unit
pnpm --filter @lms/api test:e2e            # Integration
pnpm --filter @lms/api test:cov            # Coverage report

# Frontend
pnpm --filter @lms/web test                # Unit + component
pnpm --filter @lms/web test:e2e            # Playwright

# Monorepo
pnpm test                                  # Semua unit
pnpm test:integration                      # Semua integration
pnpm test:e2e                              # Semua E2E
```

## References

- `DEFINITION-OF-DONE.md.md`
- `AGENTS.md.md`
- `MVP-TECH-STACK.md`
- `DEVELOPMENT-SETUP.md`
