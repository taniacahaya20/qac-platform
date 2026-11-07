# QAC Tester

Sistem Manajemen Test Case modern (mirip TestRail) yang dibangun dengan Bun, Elysia, Drizzle ORM, dan Nuxt 3.

## Arsitektur & Tech Stack

| Layer | Teknologi |
|---|---|
| **Runtime & Package Manager** | Bun 1.x (monorepo workspaces) |
| **Backend** | Elysia (TypeScript strict) + TypeBox (`t`) |
| **Database & ORM** | PostgreSQL (Drizzle ORM) + Embedded PGlite (zero-dependency dev) / Docker Compose |
| **Autentikasi** | `@elysiajs/jwt` + httpOnly cookies (`Bun.password` bcrypt) |
| **Dokumentasi API** | `@elysiajs/swagger` di `http://localhost:3001/swagger` |
| **Frontend** | Nuxt 3/4 (Vue 3, Composition API `<script setup lang="ts">`) |
| **UI Framework** | Tailwind CSS + Nuxt UI + Lucide Icons |
| **State Management** | Pinia |
| **Internationalization** | `@nuxtjs/i18n` (Bahasa Indonesia default + English) |

---

## Struktur Monorepo

```
qac-tester/
├── package.json
├── docker-compose.yml       # PostgreSQL 16 + Adminer
├── .env.example
├── docs/
│   └── DECISIONS.md
├── packages/
│   ├── shared/              # Tipe & Enum (@qac/shared)
│   └── playwright-reporter/ # (Fase 5) Custom Reporter Playwright
└── apps/
    ├── api/                 # Backend Elysia
    │   ├── src/
    │   │   ├── db/          # schema, migrations, seed
    │   │   ├── modules/     # auth, users, projects, reports, statuses...
    │   │   ├── plugins/     # auth-guard, error-handler, logger
    │   │   └── index.ts     # API server & export type App
    │   └── tests/           # Unit test bun test
    └── web/                 # Frontend Nuxt 3
        ├── pages/
        ├── layouts/
        ├── stores/
        ├── composables/
        └── locales/         # id.json & en.json
```

---

## Panduan Menjalankan (Getting Started)

### 1. Prasyarat
- [Bun](https://bun.sh) (v1.1+)
- Node.js 18+ (opsional, untuk build tooling Nuxt)
- Docker Desktop (opsional, untuk PostgreSQL lokal; jika tidak ada, sistem otomatis menggunakan embedded PostgreSQL via PGlite)

### 2. Instalasi Dependensi
```bash
cd qac-tester
bun install
```

### 3. Setup Database & Migrasi
Jika menggunakan Docker:
```bash
docker compose up -d postgres
```

Jalankan generate migrasi, migrate, dan seed:
```bash
bun run db:generate
bun run db:migrate
bun run db:seed
```

### 4. Akun Seed Bawaan
- **Admin**: `admin@qac.local` / `admin123`
- **Lead**: `lead@qac.local` / `lead123`
- **Tester 1**: `tester1@qac.local` / `tester123`
- **Tester 2**: `tester2@qac.local` / `tester123`
- **Demo API Key**: `qac_demo_key_12345678901234567890`

### 5. Menjalankan Server Development
Jalankan API dan Web secara bersamaan:
```bash
bun run dev
```
Atau jalankan terpisah:
- **API**: `bun run dev:api` (berjalan di `http://localhost:3001`)
- **Web**: `bun run dev:web` (berjalan di `http://localhost:3000`)
- **Swagger Docs**: `http://localhost:3001/swagger`

### 6. Linting & Testing
```bash
bun run lint   # Typecheck TypeScript & Nuxt di semua paket
bun run test   # Jalankan test suite bun test
bun run build  # Build production untuk API dan Web
```
