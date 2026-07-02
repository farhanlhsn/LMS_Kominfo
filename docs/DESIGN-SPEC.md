# DESIGN SPECIFICATION
## Kominfo AI Learning Management System
**Version:** 1.0 | **Status:** Active | **Scope:** Frontend — Web Application

---

## 1. Design Philosophy

Kominfo AI-LMS dirancang dengan prinsip **"Trustworthy Intelligence"** — antarmuka yang memancarkan keandalan institusi pemerintah sekaligus kecerdasan modern berbasis AI.

### Tiga Pilar Desain

| Pilar | Definisi |
|---|---|
| **Clarity** | Setiap elemen memiliki tujuan. Tidak ada dekorasi yang sia-sia. Hierarki konten selalu terlihat jelas. |
| **Momentum** | Animasi dan transisi yang responsif membantu pengguna memahami hasil aksi mereka, bukan sekadar hiasan. |
| **Inclusion** | WCAG 2.1 AA sebagai standar minimum. Dark mode bukan fitur tambahan, melainkan kebutuhan ergonomis. |

### Inspirasi Visual
- **Linear.app** — Sidebar bersih, tipografi tegas, kepadatan informasi yang terkelola
- **Notion** — Konten-sentris, whitespace yang lega
- **Coursera 2024** — Card-based course discovery, progress visualization yang intuitif
- **Vercel Dashboard** — Dark mode elegan dengan surface elevation berbasis gray

---

## 2. Brand Identity

### Nama & Tagline
- **Nama Platform:** Kominfo AI-LMS
- **Tagline:** *Belajar Cerdas, Bersama AI*

### Logo Usage
- Gunakan logo Kominfo resmi dikombinasikan dengan teks "AI-LMS"
- Minimum clearspace: `16px` di semua sisi
- Jangan stretch, recolor, atau tambahkan efek pada logo
- Ukuran minimum: `28px` tinggi (sidebar), `36px` (landing page)

---

## 3. Design Tokens

### 3.1 Token Architecture

Sistem token tiga lapisan untuk skalabilitas:

```
Primitive Token  →  Semantic Token  →  Component Token
(raw value)          (intent/role)       (specific usage)

Contoh:
blue-600: #2563EB  →  color.action.primary  →  button.bg.primary
```

---

### 3.2 Color System

#### Primitive Palette

**Brand Blue (Primary)**
```
blue-50:  #EFF6FF
blue-100: #DBEAFE
blue-400: #60A5FA
blue-500: #3B82F6
blue-600: #2563EB   ← primary brand
blue-700: #1D4ED8
blue-800: #1E40AF
blue-900: #1E3A8A
blue-950: #172554   ← sidebar background
```

**Accent Teal (AI / Technology)**
```
teal-400: #2DD4BF
teal-500: #14B8A6   ← AI accent
teal-600: #0D9488
teal-700: #0F766E
teal-900: #134E4A
```

**Neutral Gray (Base Surfaces)**
```
gray-50:  #F9FAFB   ← light page bg
gray-100: #F3F4F6
gray-200: #E5E7EB
gray-300: #D1D5DB
gray-400: #9CA3AF
gray-500: #6B7280
gray-600: #4B5563
gray-700: #374151
gray-800: #1F2937
gray-900: #111827   ← dark surface
gray-950: #0D1117   ← dark page bg
```

**State Colors**
```
green-500: #22C55E  ← success, completed
amber-500: #F59E0B  ← warning, pending
red-500:   #EF4444  ← error, failed
amber-400: #FBBF24  ← XP, gamification
red-600:   #DC2626  ← badge ranking (Merah Kominfo)
```

---

#### Semantic Token Mapping

**Light Mode**

| Token | Hex | Usage |
|---|---|---|
| `bg.page` | #F9FAFB | Latar halaman utama |
| `bg.surface` | #FFFFFF | Card, panel, modal |
| `bg.surface.raised` | #F3F4F6 | Dropdown, hover state |
| `bg.sidebar` | #172554 | Sidebar navigasi |
| `bg.sidebar.active` | #1E40AF | Item sidebar aktif |
| `text.primary` | #111827 | Teks utama |
| `text.secondary` | #6B7280 | Teks pendukung |
| `text.muted` | #9CA3AF | Caption, placeholder |
| `border.default` | #E5E7EB | Border standar |
| `action.primary` | #2563EB | Button utama, link |
| `action.ai` | #14B8A6 | Elemen AI |
| `state.success` | #22C55E | Sukses, selesai |
| `state.warning` | #F59E0B | Peringatan |
| `state.error` | #EF4444 | Error, gagal |
| `gamification.xp` | #FBBF24 | XP, achievement |

**Dark Mode Override**

| Token | Hex | Keterangan |
|---|---|---|
| `bg.page` | #0D1117 | Lebih gelap dari surface |
| `bg.surface` | #111827 | Card, panel |
| `bg.surface.raised` | #1F2937 | Dropdown, hover |
| `bg.sidebar` | #0D1117 | Sidebar gelap |
| `text.primary` | #F9FAFB | Teks terang |
| `text.secondary` | #9CA3AF | Teks pendukung |
| `border.default` | #374151 | Border lebih gelap |
| `action.primary` | #3B82F6 | Sedikit lebih terang |

> **Aturan Dark Mode:** Jangan gunakan pure black `#000000` atau pure white `#FFFFFF`. Selalu gunakan `gray-950` dan `gray-50` agar tidak terlalu kontras dan melelahkan mata.

---

### 3.3 Typography

#### Font Stack
```css
--font-sans: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

**Rationale:** Plus Jakarta Sans memberikan kesan modern dan profesional — cocok untuk platform pemerintah yang ingin tampil segar. Fallback ke Inter yang sudah sangat proven.

#### Google Fonts Import
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

#### Type Scale

| Token | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `display` | 36px / 2.25rem | 1.2 | 800 | Hero section, landing page |
| `h1` | 30px / 1.875rem | 1.25 | 700 | Judul halaman |
| `h2` | 24px / 1.5rem | 1.3 | 700 | Section heading |
| `h3` | 20px / 1.25rem | 1.35 | 600 | Card title, panel heading |
| `h4` | 16px / 1rem | 1.4 | 600 | Sub-section title |
| `body-lg` | 16px / 1rem | 1.6 | 400 | Konten artikel panjang |
| `body` | 14px / 0.875rem | 1.6 | 400 | Teks UI standar |
| `body-sm` | 13px / 0.8125rem | 1.5 | 400 | Caption, helper text |
| `label` | 12px / 0.75rem | 1.4 | 500 | Form label, badge |
| `caption` | 11px / 0.6875rem | 1.4 | 400 | Timestamp, metadata |
| `code` | 13px / 0.8125rem | 1.6 | 400 | Code (JetBrains Mono) |

**Typography Rules:**
- Maksimum 3 ukuran teks dalam satu section
- Gunakan semantic heading (h1 > h2 > h3), jangan skip level
- Lebar baris teks artikel max 70 karakter (65-75 optimal)
- Gunakan `font-weight: 600` untuk button text, bukan 700

---

### 3.4 Spacing System (Basis 4px)

```
2px  ← hairline separator
4px  ← xs: icon gap, tight inline spacing
8px  ← sm: within-component gap
12px ← compact padding
16px ← md: base unit, standard padding
20px ← comfortable padding
24px ← lg: card padding, section gap kecil
32px ← xl: section separator
48px ← 2xl: page section gap
64px ← section gap besar
96px ← page section gap (landing)
```

**Panduan Penggunaan:**

| Konteks | Nilai |
|---|---|
| Padding button sm | `8px 12px` |
| Padding button md | `10px 16px` |
| Padding button lg | `12px 20px` |
| Padding card | `20px` atau `24px` |
| Gap antar card | `16px` atau `24px` |
| Section vertical gap | `48px` - `64px` |
| Page horizontal padding | `24px` (mobile) / `32px` (desktop) |

---

### 3.5 Border Radius

```
4px   ← sm: badge kecil, tag
8px   ← md: input, button (default)
12px  ← lg: card, dropdown
16px  ← xl: modal, bottom sheet
24px  ← 2xl: floating AI panel, chat bubble
9999px← full: pill badge, avatar
```

---

### 3.6 Elevation & Shadow

**Light Mode:**
```css
shadow-sm:  0 1px 2px rgba(0,0,0,0.05)
shadow-md:  0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)
shadow-lg:  0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.05)
shadow-xl:  0 20px 25px rgba(0,0,0,0.10), 0 10px 10px rgba(0,0,0,0.04)
```

**Dark Mode — Surface Elevation (bukan shadow):**
```
Layer 0: bg-gray-950  ← base page
Layer 1: bg-gray-900  ← card, panel
Layer 2: bg-gray-800  ← dropdown, popover
Layer 3: bg-gray-700  ← modal, overlay
```

> Shadow tidak terlihat di dark background. Gunakan perbedaan shade untuk menunjukkan kedalaman (surface elevation).

---

### 3.7 Animation & Transition

```css
/* Duration */
150ms ← hover state, microinteraction cepat
250ms ← menu open/close, tab switch
400ms ← page transition, modal open
600ms ← progress bar fill, skeleton shimmer

/* Easing */
ease-out:  cubic-bezier(0, 0, 0.2, 1)    /* elemen masuk ke layar */
ease-in:   cubic-bezier(0.4, 0, 1, 1)    /* elemen keluar layar */
ease-both: cubic-bezier(0.4, 0, 0.2, 1)  /* elemen berubah posisi */
```

**Aturan Animasi:**
- Hindari animasi lebih dari 500ms untuk interaksi UI biasa
- Selalu sediakan `prefers-reduced-motion: reduce` override
- Animasi harus bermakna: progress feedback, state change — bukan dekorasi semata

---

## 4. Component Design Guidelines

### 4.1 Buttons

**Ukuran:**
```
sm: h-8  px-3  text-xs   (32px)
md: h-9  px-4  text-sm   (36px) ← default
lg: h-10 px-6  text-sm   (40px)
xl: h-12 px-8  text-base (48px)
```

**Variants:**
```
primary   → bg-blue-600   text-white   hover:bg-blue-700
secondary → bg-white      text-gray-900 border border-gray-200
ghost     → bg-transparent             hover:bg-gray-100
danger    → bg-red-500    text-white   hover:bg-red-600
ai        → bg-teal-500   text-white   hover:bg-teal-600
```

**Rules:**
- Selalu tampilkan spinner di dalam button saat loading async
- Minimum touch target 44x44px di mobile (WCAG)
- Jangan disable button tanpa tooltip penjelasan

---

### 4.2 Cards

```
Standard Card:
  bg:     white / gray-900 (dark)
  border: 1px solid border.default
  radius: 12px
  padding: 20px atau 24px
  shadow: shadow-sm
  hover:  shadow-md + translateY(-2px) — 250ms

Course Card:
  Tambah thumbnail 16:9 di atas
  Tambah progress bar di bawah thumbnail
  Tambah difficulty badge (overlay, kiri atas)
  Hover: scale(1.02) + shadow-lg
```

---

### 4.3 Sidebar

```
Lebar:
  Expanded:  240px
  Collapsed: 64px (icon only + tooltip)

Struktur (atas ke bawah):
  Logo area      (64px tinggi, 16px padding)
  Search bar     (Ctrl+K shortcut)
  ─────────────
  Dashboard
  Courses
  Certificates
  Leaderboard
  AI Assistant   ← teal accent, special styling
  ─────────────
  Profile
  Settings

Active item:
  bg: blue-800 (light) / gray-700 (dark)
  border-left: 3px solid blue-400
  font-weight: 600

Hover item:
  bg: rgba(255,255,255,0.08)
  transition: 150ms
```

---

### 4.4 Forms & Inputs

```
Height:  36px (sm) / 40px (md) / 44px (lg)
Padding: 8px 12px
Border:  1px solid border.default
Radius:  8px
Focus:   border-blue-600 + ring-2 ring-blue-200 (ring-blue-900/30 dark)

Label:
  font-size: 12px, font-weight: 500
  margin-bottom: 6px

Error/Helper:
  font-size: 12px, margin-top: 4px
  error: text-red-500
  helper: text-gray-500
```

---

### 4.5 Navigation Tabs

**Underline style** (course detail, profil, settings):
```
item: px-4 py-2.5
inactive: text-gray-500
active: text-gray-900 + border-bottom: 2px solid blue-600
transition: 150ms
```

**Pill style** (leaderboard, filter, quiz navigator):
```
item: px-3 py-1.5 rounded-full
inactive: bg-transparent text-gray-500
active: bg-blue-600 text-white
```

---

### 4.6 Progress Indicators

**Linear Bar:**
```css
height: 4px (mini) / 6px (standard) / 8px (large)
border-radius: 9999px
track: gray-200 / gray-700 (dark)
fill: blue-500 (default) | teal-500 (AI) | green-500 (completed)
transition: width 600ms ease-out
```

**Circular Ring:**
```
size: 80px (sm) / 120px (md)
stroke-width: 8px
track: gray-200 / gray-700 (dark)
fill: blue-600
Center: persentase, text-xl font-bold
```

---

### 4.7 Badges & Status Chips

**Difficulty:**
```
BEGINNER:     bg-green-100 text-green-700
INTERMEDIATE: bg-amber-100 text-amber-700
ADVANCED:     bg-red-100   text-red-700
```

**Status:**
```
DRAFT:     bg-gray-100  text-gray-600
PUBLISHED: bg-blue-100  text-blue-700
COMPLETED: bg-green-100 text-green-700
PENDING:   bg-amber-100 text-amber-700
FAILED:    bg-red-100   text-red-600
LOCKED:    bg-gray-100  text-gray-400
```

**XP Badge:**
```
bg-amber-400 text-amber-900 font-bold
Prefix icon: bintang atau petir
```

---

### 4.8 Skeleton Loading

Jangan gunakan spinner-only untuk loading section besar.

```css
/* Shimmer animation */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}

.skeleton {
  background: linear-gradient(90deg,
    #e5e7eb 25%,   /* gray-200 */
    #f3f4f6 50%,   /* gray-100 */
    #e5e7eb 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.dark .skeleton {
  background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
}
```

---

### 4.9 AI Assistant Panel

Komponen AI punya visual identity tersendiri agar mudah dikenali.

```
Panel container:
  bg: linear-gradient(135deg, #0D1117, #1a2332)
  border: 1px solid rgba(20,184,166,0.2)
  border-radius: 16px

AI bubble (assistant):
  bg: rgba(20,184,166,0.08)
  border: 1px solid rgba(20,184,166,0.15)
  radius: 16px — sudut kiri atas 0

User bubble:
  bg: blue-600, text: white
  radius: 16px — sudut kanan atas 0

AI header label:
  "✨ AI Tutor" — teal-400 font-semibold uppercase tracking-wider

Typing indicator:
  3 titik bounce stagger 200ms per titik, warna teal-400
```

---

## 5. Page-Level Design Patterns

### 5.1 Dashboard (/dashboard)

```
Layout: Sidebar 240px + fluid content

Widget Grid (Desktop):
  Row 1: [Continue Learning — 2 col] [Stats — 1 col]
  Row 2: [Upcoming Assignment]       [Leaderboard Preview]
  Row 3: [Recommended Courses — 3 col                   ]

Mobile: Stack vertikal, gap-4, full width

Widget Rules:
  - Semua widget punya skeleton state saat loading
  - Stats: angka besar text-3xl + label text-sm + trend badge
  - Continue Learning: thumbnail + progress bar + waktu tersisa
```

---

### 5.2 Course Catalog (/courses)

```
Layout: Filter sidebar kiri + Grid kanan

Grid:
  Desktop: 3-4 kolom
  Tablet:  2 kolom
  Mobile:  1 kolom

Filter Panel:
  Desktop: sticky, selalu tampil
  Mobile:  bottom sheet / drawer kiri

Search:  debounce 300ms, prominent search bar di atas
Sort:    dropdown (Terbaru / Terpopuler / Rekomendasi AI)
```

---

### 5.3 Learn Page (/learn/[lessonId])

```
Layout 3-kolom (desktop):
  Left  (240px):  Lesson nav sidebar (sticky + scrollable)
  Center (fluid): Konten lesson (max-width: 800px, centered)
  Right  (300px): AI panel + Catatan (toggle-able)

Mobile:
  Tab bar bawah: Content / Daftar / AI

Lesson Nav:
  Module label: text-xs uppercase tracking-wider font-bold
  Lesson item: 36px tinggi, ikon status, truncate title

Content:
  Markdown: prose (16px, line-height 1.75)
  Video: 16:9 container, custom player
  PDF: embedded viewer

AI Mobile:
  FAB floating, bottom-right, teal-500, 56px, shadow-xl
```

---

### 5.4 Quiz Page (/quiz/[id])

```
Layout: Full-focus — sidebar quiz navigator, bukan sidebar utama

Header:
  Progress bar full-width + "Soal X dari Y" + timer

Soal:
  font-size 18px, font-weight 600
  max-width 720px, centered, line-height 1.6

Pilihan (52px tinggi):
  default:   border-2 border-gray-200
  hover:     border-blue-400
  selected:  border-blue-600 + bg-blue-50 / bg-blue-950 (dark)
  correct:   border-green-500 + bg-green-50
  wrong:     border-red-500 + bg-red-50

Timer:
  < 60 detik: text-red-500 + subtle shake animation
Navigator: grid kecil soal di kanan (sticky)
```

---

### 5.5 Admin Dashboard (/admin)

```
Tone: Lebih padat dan profesional
Sidebar: gray-950 background

Table:
  Row height: 48px
  Header: text-xs uppercase tracking-wider font-semibold
  Action column: sticky kanan
  Hover row: bg-gray-100 / bg-gray-800 (dark)

Charts:
  Primary metrics: blue-500
  AI usage: teal-500
  Gamification: amber-400
  Selalu ada tooltip + readable legend
```

---

## 6. Responsive Breakpoints

| Breakpoint | px | Target |
|---|---|---|
| xs | 0 | Mobile portrait |
| sm | 480px | Mobile landscape |
| md | 768px | Tablet portrait |
| lg | 1024px | Tablet landscape / laptop |
| xl | 1280px | Desktop |
| 2xl | 1536px | Large desktop |

**Behavior:**

| Breakpoint | Sidebar | AI Panel |
|---|---|---|
| xs - md | Hidden (drawer) | FAB floating |
| lg | Collapsed (icons) | Toggle panel |
| xl+ | Expanded 240px | Fixed panel 300px |

---

## 7. Aksesibilitas (WCAG 2.1 AA)

### Color Contrast

| Pasangan | Ratio Min | Standard |
|---|---|---|
| text.primary / bg.page | 7:1 | AAA |
| text.secondary / bg.page | 4.5:1 | AA |
| text.muted / bg.page | 3:1 | AA Large |
| Button text / button bg | 4.5:1 | AA |

### Keyboard Navigation
- Semua elemen interaktif bisa difokus dengan `Tab`
- Focus ring: `ring-2 ring-blue-500 ring-offset-2` — terlihat jelas
- Jangan hapus outline default, customise saja
- Modal: harus melakukan focus trap saat aktif

### Screen Reader
- Gambar: selalu punya `alt` yang deskriptif
- Icon-only button: wajib `aria-label`
- Form field: `label` terhubung dengan `htmlFor`
- Progress bar: `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Loading: `aria-busy="true"` + `aria-label="Memuat konten..."`

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Dark Mode

### Implementasi
- CSS custom properties di-override pada class `.dark`
- Tailwind: `darkMode: 'class'`
- Deteksi `prefers-color-scheme` saat pertama kali load
- Pilihan manual disimpan di `localStorage` key `lms-theme`

### Rules
1. Jangan `bg-black` — gunakan `gray-950`
2. Jangan `text-white` murni — gunakan `gray-50`
3. Glassmorphism: opacity lebih rendah di dark (lebih buram)
4. Icon: warna berubah via CSS variable, bukan dua file terpisah
5. Chart: validasi kontras semua warna di dark background

---

## 9. Microinteraction Catalogue

| Trigger | Animasi | Durasi |
|---|---|---|
| Button hover | Scale 1.02 + shadow naik | 150ms ease-out |
| Button click | Scale 0.98 | 100ms |
| Lesson selesai | Checkmark draw + confetti burst | 400ms |
| Quiz benar | Border flash green + scale pulse | 300ms |
| Quiz salah | Border flash red + horizontal shake | 400ms |
| Progress bar naik | Width fill dari kiri | 600ms ease-out |
| XP gained | Counter angka naik + badge scale | 500ms |
| Sidebar hover | Background fade in | 150ms |
| Card hover | translateY(-2px) + shadow-md | 200ms |
| Notifikasi masuk | Slide in dari kanan | 300ms ease-out |
| Modal buka | Scale 0.95→1 + fade in | 250ms |
| Skeleton | Gradient shimmer sweep | 1.5s infinite |
| Tab switch | Content crossfade | 200ms |
| AI typing | 3 titik bounce stagger 200ms | Loop |

---

## 10. Implementasi di Codebase

### tailwind.config.ts
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EFF6FF',
          600: '#2563EB',  // primary action
          700: '#1D4ED8',
          800: '#1E40AF',  // sidebar active
          950: '#172554',  // sidebar bg
        },
        ai: {
          400: '#2DD4BF',
          500: '#14B8A6',  // AI primary accent
          600: '#0D9488',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0'  },
        },
      },
    },
  },
};

export default config;
```

### globals.css (CSS Variables)
```css
:root {
  --color-bg-page:      249 250 251;   /* gray-50  */
  --color-bg-surface:   255 255 255;   /* white    */
  --color-text-primary: 17 24 39;      /* gray-900 */
  --color-border:       229 231 235;   /* gray-200 */
  --color-action:       37 99 235;     /* blue-600 */
  --color-ai:           20 184 166;    /* teal-500 */
}

.dark {
  --color-bg-page:      13 17 23;      /* gray-950 */
  --color-bg-surface:   17 24 39;      /* gray-900 */
  --color-text-primary: 249 250 251;   /* gray-50  */
  --color-border:       55 65 81;      /* gray-700 */
  --color-action:       59 130 246;    /* blue-500 */
}
```

### CVA Button Pattern
```ts
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold',
    'transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        primary:   'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
        secondary: 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800',
        ghost:     'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
        ai:        'bg-teal-500 text-white hover:bg-teal-600 focus-visible:ring-teal-500',
        danger:    'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500',
      },
      size: {
        sm: 'h-8  px-3 text-xs',
        md: 'h-9  px-4 text-sm',
        lg: 'h-10 px-6 text-sm',
        xl: 'h-12 px-8 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

---

## 11. Design Checklist Per Halaman

Sebelum halaman dianggap selesai, centang semua:

### Visual
- [ ] Menggunakan color token, tidak ada hardcoded hex
- [ ] Typography mengikuti type scale yang ditetapkan
- [ ] Spacing adalah kelipatan 4px
- [ ] Dark mode berfungsi tanpa artefak atau kontras buruk
- [ ] Responsive di xs, md, lg, xl

### Interaksi
- [ ] Setiap button punya hover & active state
- [ ] Loading menggunakan Skeleton, bukan spinner saja
- [ ] Error state menampilkan pesan yang actionable
- [ ] Empty state punya ilustrasi + CTA

### Aksesibilitas
- [ ] Color contrast minimal 4.5:1 untuk body text
- [ ] Tab navigation berfungsi, focus ring terlihat jelas
- [ ] Semua gambar punya alt text
- [ ] Form label terhubung ke input via htmlFor

### Performa
- [ ] Tidak ada CLS (Cumulative Layout Shift) saat load
- [ ] Animasi menggunakan `transform`/`opacity`, bukan `width`/`height`/`top`
- [ ] Font pakai `display=swap`
- [ ] Gambar via `next/image` dengan ukuran yang tepat

---

## Lampiran: Referensi

| Sumber | Relevansi |
|---|---|
| Linear.app | Sidebar pattern, typography density, dark mode |
| Vercel Dashboard | Surface elevation, minimal dark aesthetic |
| Coursera 2024 | Course card design, progress visualization |
| Notion | Whitespace, content-first approach |
| Tailwind UI | Component patterns, form design |
| Radix UI / shadcn | Accessible primitives, ARIA patterns |
| WCAG 2.1 | Accessibility standards |
| Framer Motion | Animation best practices |
| Material Design 3 | Color token architecture |
| Apple HIG | Mobile UX, touch target guidelines |

---

*Living document — diperbarui setiap ada perubahan sistem desain yang signifikan.*
*Terakhir diperbarui: 2026-07-02 | Tim: Kominfo AI-LMS*

