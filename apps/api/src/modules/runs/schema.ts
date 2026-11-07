import { t } from 'elysia'

export const createRunBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  description: t.Optional(t.String()),
  milestoneId: t.Optional(t.Nullable(t.String())),
  assignedTo: t.Optional(t.Nullable(t.String())),
  includeAll: t.Optional(t.Boolean()),
  caseIds: t.Optional(t.Array(t.String())),
})

export const addResultBody = t.Object({
  statusId: t.Number(),
  comment: t.Optional(t.String()),
  elapsed: t.Optional(t.Number()),
  defects: t.Optional(t.String()),
  version: t.Optional(t.String()),
  priority: t.Optional(t.String()),
  severity: t.Optional(t.String()),
  assignedToName: t.Optional(t.String()),
  larkWebhookUrl: t.Optional(t.String()),
  larkAppId: t.Optional(t.String()),
  larkAppSecret: t.Optional(t.String()),
  pushToLark: t.Optional(t.Boolean()),
  createLarkTask: t.Optional(t.Boolean()),
})

export const bulkAddResultBody = t.Object({
  testIds: t.Array(t.String()),
  statusId: t.Number(),
  comment: t.Optional(t.String()),
})
