import { t } from 'elysia'

export const createProjectBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  description: t.Optional(t.String()),
  announcement: t.Optional(t.String()),
})

export const updateProjectBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  description: t.Optional(t.Nullable(t.String())),
  announcement: t.Optional(t.Nullable(t.String())),
  isCompleted: t.Optional(t.Boolean()),
})
