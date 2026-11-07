export const UserRole = {
  ADMIN: 'admin',
  LEAD: 'lead',
  TESTER: 'tester',
  VIEWER: 'viewer',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const ProjectMemberRole = {
  LEAD: 'lead',
  TESTER: 'tester',
  VIEWER: 'viewer',
} as const
export type ProjectMemberRole = (typeof ProjectMemberRole)[keyof typeof ProjectMemberRole]

export const CaseType = {
  FUNCTIONAL: 'Functional',
  REGRESSION: 'Regression',
  SMOKE: 'Smoke',
  SECURITY: 'Security',
  PERFORMANCE: 'Performance',
  USABILITY: 'Usability',
  OTHER: 'Other',
} as const
export type CaseType = (typeof CaseType)[keyof typeof CaseType]

export const CasePriority = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
} as const
export type CasePriority = (typeof CasePriority)[keyof typeof CasePriority]

export const CaseTemplate = {
  TEXT: 'text',
  STEPS: 'steps',
  EXPLORATORY: 'exploratory',
} as const
export type CaseTemplate = (typeof CaseTemplate)[keyof typeof CaseTemplate]

export const AutomationStatus = {
  MANUAL: 'manual',
  AUTOMATED: 'automated',
  TO_BE_AUTOMATED: 'to_be_automated',
} as const
export type AutomationStatus = (typeof AutomationStatus)[keyof typeof AutomationStatus]

export const RunSource = {
  MANUAL: 'manual',
  AUTOMATION: 'automation',
} as const
export type RunSource = (typeof RunSource)[keyof typeof RunSource]

export const AttachmentEntityType = {
  CASE: 'case',
  RESULT: 'result',
} as const
export type AttachmentEntityType = (typeof AttachmentEntityType)[keyof typeof AttachmentEntityType]

export const ActivityAction = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  CLOSE: 'close',
  REOPEN: 'reopen',
  RERUN: 'rerun',
  ASSIGN: 'assign',
  PASS: 'pass',
  FAIL: 'fail',
} as const
export type ActivityAction = (typeof ActivityAction)[keyof typeof ActivityAction]

export const StatusId = {
  PASSED: 1,
  FAILED: 2,
  BLOCKED: 3,
  RETEST: 4,
  UNTESTED: 5,
  SKIPPED: 6,
} as const
export type StatusId = (typeof StatusId)[keyof typeof StatusId]

export const PLAYWRIGHT_STATUS_MAP: Record<string, number> = {
  passed: StatusId.PASSED,
  failed: StatusId.FAILED,
  timedOut: StatusId.FAILED,
  skipped: StatusId.SKIPPED,
  interrupted: StatusId.BLOCKED,
}
