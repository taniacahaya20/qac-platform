import { t } from 'elysia'

export const createMilestoneBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  description: t.Optional(t.String()),
  startDate: t.Optional(t.String()),
  dueDate: t.Optional(t.String()),
  parentId: t.Optional(t.Nullable(t.String())),
})

export const updateMilestoneBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  description: t.Optional(t.Nullable(t.String())),
  startDate: t.Optional(t.Nullable(t.String())),
  dueDate: t.Optional(t.Nullable(t.String())),
  isCompleted: t.Optional(t.Boolean()),
})
