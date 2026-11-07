# Technical Decisions

## KT-001: Suite Mode — Single vs Multiple
**Decision**: Each project has one **default suite**. Additional suites can be created, but the UI defaults to showing sections from the default suite.
**Reason**: Simplest UX, fits most small-medium projects.

## KT-002: Attachment Storage — Local
**Decision**: Files stored in `apps/api/storage/` with path `{entity_type}/{entity_id}/{uuid}-{filename}`. `StorageAdapter` interface abstracted for easy S3/MinIO migration.
**Reason**: Zero external dependencies for local setup.

## KT-003: Case Code Generation
**Decision**: PostgreSQL sequence `cases_code_seq`. Code format `C{4-digit padded}`, e.g. `C0001`. Global sequence for system-wide uniqueness.
**Reason**: Easy to reference anywhere without knowing the project.

## KT-004: Nested Sections
**Decision**: Store `parent_id` and `depth`. Load tree with recursive CTE in PostgreSQL. No DB depth limit, UI max 5 levels.

## KT-005: Eden Treaty in Nuxt
**Decision**: `useApi()` composable wrapping Eden Treaty. Base URL via `NUXT_PUBLIC_API_URL`.

## KT-006: i18n
**Decision**: `@nuxtjs/i18n` with default locale `id`. Translation files in `apps/web/locales/{id,en}.json`.
