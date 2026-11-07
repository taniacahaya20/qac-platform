import { t } from 'elysia'

export const createSectionBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  description: t.Optional(t.String()),
  parentId: t.Optional(t.Nullable(t.String())),
  suiteId: t.Optional(t.String()),
})

export const updateSectionBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  description: t.Optional(t.Nullable(t.String())),
  parentId: t.Optional(t.Nullable(t.String())),
  sortOrder: t.Optional(t.Number()),
})
