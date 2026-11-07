import { t } from 'elysia'

export const stepItem = t.Object({
  content: t.String(),
  expected: t.Optional(t.String()),
})

export const createCaseBody = t.Object({
  sectionId: t.Optional(t.String()),
  moduleId: t.Optional(t.String()),
  actor: t.Optional(t.String()),
  condition: t.Optional(t.String()),
  code: t.Optional(t.String()),
  title: t.String({ minLength: 1, maxLength: 500 }),
  description: t.Optional(t.String()),
  type: t.Optional(
    t.Union([
      t.Literal('Functional'),
      t.Literal('Regression'),
      t.Literal('Smoke'),
      t.Literal('Security'),
      t.Literal('Performance'),
      t.Literal('Usability'),
      t.Literal('Other'),
    ])
  ),
  priority: t.Optional(
    t.Union([
      t.Literal('Critical'),
      t.Literal('High'),
      t.Literal('Medium'),
      t.Literal('Low'),
    ])
  ),
  template: t.Optional(
    t.Union([
      t.Literal('text'),
      t.Literal('steps'),
      t.Literal('exploratory'),
    ])
  ),
  preconditions: t.Optional(t.String()),
  steps: t.Optional(t.Array(stepItem)),
  expectedResult: t.Optional(t.String()),
  testData: t.Optional(t.String()),
  statusData: t.Optional(t.String()),
  actualResult: t.Optional(t.String()),
  notes: t.Optional(t.String()),
  estimate: t.Optional(t.Number()),
  refs: t.Optional(t.String()),
  automationStatus: t.Optional(
    t.Union([
      t.Literal('manual'),
      t.Literal('automated'),
      t.Literal('to_be_automated'),
    ])
  ),
  automationKey: t.Optional(t.String()),
  labels: t.Optional(t.Array(t.String())),
})

export const updateCaseBody = t.Object({
  sectionId: t.Optional(t.String()),
  moduleId: t.Optional(t.Nullable(t.String())),
  actor: t.Optional(t.Nullable(t.String())),
  condition: t.Optional(t.Nullable(t.String())),
  code: t.Optional(t.String()),
  title: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
  description: t.Optional(t.Nullable(t.String())),
  type: t.Optional(
    t.Union([
      t.Literal('Functional'),
      t.Literal('Regression'),
      t.Literal('Smoke'),
      t.Literal('Security'),
      t.Literal('Performance'),
      t.Literal('Usability'),
      t.Literal('Other'),
    ])
  ),
  priority: t.Optional(
    t.Union([
      t.Literal('Critical'),
      t.Literal('High'),
      t.Literal('Medium'),
      t.Literal('Low'),
    ])
  ),
  template: t.Optional(
    t.Union([
      t.Literal('text'),
      t.Literal('steps'),
      t.Literal('exploratory'),
    ])
  ),
  preconditions: t.Optional(t.Nullable(t.String())),
  steps: t.Optional(t.Nullable(t.Array(stepItem))),
  expectedResult: t.Optional(t.Nullable(t.String())),
  testData: t.Optional(t.Nullable(t.String())),
  statusData: t.Optional(t.Nullable(t.String())),
  actualResult: t.Optional(t.Nullable(t.String())),
  notes: t.Optional(t.Nullable(t.String())),
  estimate: t.Optional(t.Nullable(t.Number())),
  refs: t.Optional(t.Nullable(t.String())),
  automationStatus: t.Optional(
    t.Union([
      t.Literal('manual'),
      t.Literal('automated'),
      t.Literal('to_be_automated'),
    ])
  ),
  automationKey: t.Optional(t.Nullable(t.String())),
  labels: t.Optional(t.Nullable(t.Array(t.String()))),
})

export const filterCasesQuery = t.Object({
  sectionId: t.Optional(t.String()),
  moduleId: t.Optional(t.String()),
  suiteId: t.Optional(t.String()),
  priority: t.Optional(t.String()),
  type: t.Optional(t.String()),
  condition: t.Optional(t.String()),
  automationStatus: t.Optional(t.String()),
  search: t.Optional(t.String()),
  page: t.Optional(t.Numeric()),
  limit: t.Optional(t.Numeric()),
})
