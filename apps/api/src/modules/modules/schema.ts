import { t } from 'elysia'

export const createModuleBody = t.Object({
  name: t.String({ minLength: 1 }),
  code: t.Optional(t.String()),
  description: t.Optional(t.String()),
})

export const updateModuleBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  code: t.Optional(t.String()),
  description: t.Optional(t.String()),
})

export type CreateModuleInput = typeof createModuleBody.static
export type UpdateModuleInput = typeof updateModuleBody.static
