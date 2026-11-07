import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['admin', 'lead', 'tester', 'viewer'])
export const projectMemberRoleEnum = pgEnum('project_member_role', ['lead', 'tester', 'viewer'])
export const caseTypeEnum = pgEnum('case_type', [
  'Functional', 'Regression', 'Smoke', 'Security', 'Performance', 'Usability', 'Other',
])
export const casePriorityEnum = pgEnum('case_priority', ['Critical', 'High', 'Medium', 'Low'])
export const caseTemplateEnum = pgEnum('case_template', ['text', 'steps', 'exploratory'])
export const automationStatusEnum = pgEnum('automation_status', [
  'manual', 'automated', 'to_be_automated',
])
export const runSourceEnum = pgEnum('run_source', ['manual', 'automation'])
export const attachmentEntityTypeEnum = pgEnum('attachment_entity_type', ['case', 'result'])

export const caseCodeSeq = pgSequence('cases_code_seq', { startWith: 1, increment: 1 })

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('tester'),
  isActive: boolean('is_active').notNull().default(true),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  hashedKey: text('hashed_key').notNull().unique(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  announcement: text('announcement'),
  larkWebhookUrl: text('lark_webhook_url'),
  larkAppId: text('lark_app_id'),
  larkAppSecret: text('lark_app_secret'),
  larkTasklistGuid: text('lark_tasklist_guid'),
  isCompleted: boolean('is_completed').notNull().default(false),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const projectMembers = pgTable(
  'project_members',
  {
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: projectMemberRoleEnum('role').notNull().default('tester'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.userId] }),
  })
)

export const suites = pgTable('suites', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sections = pgTable('sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  suiteId: uuid('suite_id').notNull().references(() => suites.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  name: text('name').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  depth: integer('depth').notNull().default(0),
})

export const statuses = pgTable('statuses', {
  id: smallint('id').primaryKey(),
  name: text('name').unique().notNull(),
  label: text('label').notNull(),
  color: text('color').notNull(),
  isFinal: boolean('is_final').notNull().default(false),
  isDefault: boolean('is_default').notNull().default(false),
  isSystem: boolean('is_system').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const modules = pgTable('modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const actors = pgTable('actors', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique().notNull(),
  sectionId: uuid('section_id').notNull().references(() => sections.id),
  moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'set null' }),
  actor: text('actor'),
  condition: text('condition'),
  title: text('title').notNull(),
  description: text('description'),
  type: caseTypeEnum('type').notNull().default('Functional'),
  priority: casePriorityEnum('priority').notNull().default('Medium'),
  template: caseTemplateEnum('template').notNull().default('steps'),
  preconditions: text('preconditions'),
  steps: jsonb('steps').$type<Array<{ content: string; expected: string }>>(),
  expectedResult: text('expected_result'),
  testData: text('test_data'),
  statusData: text('status_data').default('Pass'),
  actualResult: text('actual_result'),
  notes: text('notes'),
  estimate: integer('estimate'),
  refs: text('refs'),
  automationStatus: automationStatusEnum('automation_status').notNull().default('manual'),
  automationKey: text('automation_key').unique(),
  labels: text('labels').array(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  updatedBy: uuid('updated_by').notNull().references(() => users.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const caseVersions = pgTable('case_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  snapshot: jsonb('snapshot').notNull(),
  changedBy: uuid('changed_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const milestones = pgTable('milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  name: text('name').notNull(),
  description: text('description'),
  startDate: date('start_date'),
  dueDate: date('due_date'),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const testPlans = pgTable('test_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  milestoneId: uuid('milestone_id').references(() => milestones.id),
  name: text('name').notNull(),
  description: text('description'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const testRuns = pgTable('test_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').references(() => testPlans.id),
  milestoneId: uuid('milestone_id').references(() => milestones.id),
  name: text('name').notNull(),
  description: text('description'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  includeAll: boolean('include_all').notNull().default(true),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  source: runSourceEnum('source').notNull().default('manual'),
  ciInfo: jsonb('ci_info').$type<{
    branch?: string
    commit?: string
    buildNo?: string
    pipelineUrl?: string
    environment?: string
  }>(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tests = pgTable('tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').notNull().references(() => testRuns.id, { onDelete: 'cascade' }),
  caseId: uuid('case_id').notNull().references(() => cases.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  caseSnapshot: jsonb('case_snapshot').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const results = pgTable('results', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: uuid('test_id').notNull().references(() => tests.id, { onDelete: 'cascade' }),
  statusId: smallint('status_id').notNull().references(() => statuses.id),
  comment: text('comment'),
  elapsed: integer('elapsed'),
  version: text('version'),
  defects: text('defects'),
  isAutomated: boolean('is_automated').notNull().default(false),
  errorMessage: text('error_message'),
  stackTrace: text('stack_trace'),
  retryCount: integer('retry_count').notNull().default(0),
  isFlaky: boolean('is_flaky').notNull().default(false),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: attachmentEntityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  filename: text('filename').notNull(),
  storedName: text('stored_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  path: text('path').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: uuid('entity_id').notNull(),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const issues = pgTable('issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  runId: uuid('run_id').references(() => testRuns.id, { onDelete: 'cascade' }),
  testId: uuid('test_id').references(() => tests.id, { onDelete: 'cascade' }),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  actualResult: text('actual_result'),
  priority: text('priority').notNull().default('High'),
  severity: text('severity').notNull().default('Major'),
  status: text('status').notNull().default('open'), // 'open' | 'in_progress' | 'resolved' | 'closed'
  assignedTo: uuid('assigned_to').references(() => users.id),
  assignedToName: text('assigned_to_name'),
  devNotes: text('dev_notes'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projectMembers: many(projectMembers),
  apiKeys: many(apiKeys),
  createdCases: many(cases, { relationName: 'createdCases' }),
  createdResults: many(results),
  activityLogs: many(activityLog),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  createdByUser: one(users, { fields: [projects.createdBy], references: [users.id] }),
  members: many(projectMembers),
  suites: many(suites),
  milestones: many(milestones),
  testPlans: many(testPlans),
  testRuns: many(testRuns),
  activityLogs: many(activityLog),
}))

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}))

export const suitesRelations = relations(suites, ({ one, many }) => ({
  project: one(projects, { fields: [suites.projectId], references: [projects.id] }),
  sections: many(sections),
}))

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  suite: one(suites, { fields: [sections.suiteId], references: [suites.id] }),
  cases: many(cases),
}))

export const modulesRelations = relations(modules, ({ one, many }) => ({
  project: one(projects, { fields: [modules.projectId], references: [projects.id] }),
  cases: many(cases),
}))

export const casesRelations = relations(cases, ({ one, many }) => ({
  section: one(sections, { fields: [cases.sectionId], references: [sections.id] }),
  module: one(modules, { fields: [cases.moduleId], references: [modules.id] }),
  createdByUser: one(users, {
    fields: [cases.createdBy],
    references: [users.id],
    relationName: 'createdCases',
  }),
  versions: many(caseVersions),
  tests: many(tests),
}))

export const testRunsRelations = relations(testRuns, ({ one, many }) => ({
  project: one(projects, { fields: [testRuns.projectId], references: [projects.id] }),
  milestone: one(milestones, { fields: [testRuns.milestoneId], references: [milestones.id] }),
  plan: one(testPlans, { fields: [testRuns.planId], references: [testPlans.id] }),
  tests: many(tests),
  createdByUser: one(users, { fields: [testRuns.createdBy], references: [users.id] }),
}))

export const testsRelations = relations(tests, ({ one, many }) => ({
  run: one(testRuns, { fields: [tests.runId], references: [testRuns.id] }),
  case: one(cases, { fields: [tests.caseId], references: [cases.id] }),
  results: many(results),
}))

export const resultsRelations = relations(results, ({ one }) => ({
  test: one(tests, { fields: [results.testId], references: [tests.id] }),
  status: one(statuses, { fields: [results.statusId], references: [statuses.id] }),
  createdByUser: one(users, { fields: [results.createdBy], references: [users.id] }),
}))

export const statusesRelations = relations(statuses, ({ many }) => ({
  results: many(results),
}))

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  project: one(projects, { fields: [activityLog.projectId], references: [projects.id] }),
  user: one(users, { fields: [activityLog.userId], references: [users.id] }),
}))
