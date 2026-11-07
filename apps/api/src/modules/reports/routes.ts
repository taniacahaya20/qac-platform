import { Elysia } from 'elysia'
import { db } from '../../db'
import {
  testRuns,
  tests,
  results,
  statuses,
  activityLog,
  users,
  projects,
  projectMembers,
  cases,
  sections,
  suites,
} from '../../db/schema'
import { eq, and, gte, sql, inArray, desc, isNull } from 'drizzle-orm'
import { authGuard } from '../../plugins/auth-guard'
import { success, errorResponse } from '../../lib/response'
import { isProjectMember } from '../projects/service'

export const reportsRoutes = new Elysia({ prefix: '/reports' })
  .use(authGuard)
  .get('/dashboard', async ({ currentUser }) => {
    let projectIds: string[] = []
    if (currentUser.role === 'admin') {
      const rows = await db.select({ id: projects.id }).from(projects)
      projectIds = rows.map((r) => r.id)
    } else {
      const rows = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, currentUser.id))
      projectIds = rows.map((r) => r.projectId)
    }

    if (projectIds.length === 0) {
      return success({ activeRuns: 0, myTodo: [], recentActivity: [], activityChart: [] })
    }

    const [{ activeRuns }] = await db
      .select({ activeRuns: sql<number>`count(*)` })
      .from(testRuns)
      .where(and(inArray(testRuns.projectId, projectIds), eq(testRuns.isCompleted, false)))

    const myTodo = await db
      .select({
        testId: tests.id,
        runId: testRuns.id,
        runName: testRuns.name,
        projectId: testRuns.projectId,
        caseTitle: sql<string>`(${tests.caseSnapshot}->>'title')`,
        caseCode: sql<string>`(${tests.caseSnapshot}->>'code')`,
      })
      .from(tests)
      .innerJoin(testRuns, eq(tests.runId, testRuns.id))
      .where(
        and(
          eq(tests.assignedTo, currentUser.id),
          eq(testRuns.isCompleted, false),
          inArray(testRuns.projectId, projectIds)
        )
      )
      .limit(10)

    const since = new Date()
    since.setDate(since.getDate() - 14)

    const activityChart = await db
      .select({
        date: sql<string>`date_trunc('day', ${results.createdAt})::date::text`,
        statusId: results.statusId,
        statusName: statuses.name,
        statusColor: statuses.color,
        count: sql<number>`count(*)`,
      })
      .from(results)
      .innerJoin(tests, eq(results.testId, tests.id))
      .innerJoin(testRuns, eq(tests.runId, testRuns.id))
      .innerJoin(statuses, eq(results.statusId, statuses.id))
      .where(and(inArray(testRuns.projectId, projectIds), gte(results.createdAt, since)))
      .groupBy(
        sql`date_trunc('day', ${results.createdAt})::date::text`,
        results.statusId,
        statuses.name,
        statuses.color
      )
      .orderBy(sql`date_trunc('day', ${results.createdAt})::date::text`)

    const recentActivity = await db
      .select({
        id: activityLog.id,
        action: activityLog.action,
        entity: activityLog.entity,
        entityId: activityLog.entityId,
        meta: activityLog.meta,
        createdAt: activityLog.createdAt,
        userName: users.name,
        userId: users.id,
      })
      .from(activityLog)
      .innerJoin(users, eq(activityLog.userId, users.id))
      .where(inArray(activityLog.projectId, projectIds))
      .orderBy(desc(activityLog.createdAt))
      .limit(20)

    return success({
      activeRuns: Number(activeRuns),
      myTodo,
      recentActivity,
      activityChart,
    })
  })

export const projectReportRoutes = new Elysia({ prefix: '/projects/:id/reports' })
  .use(authGuard)
  .get('/summary', async ({ params, currentUser, set }) => {
    const isMember = await isProjectMember(params.id, currentUser.id, currentUser.role)
    if (!isMember) {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Bukan anggota project ini')
    }

    // Get all runs of this project
    const runs = await db
      .select({ id: testRuns.id, name: testRuns.name, createdAt: testRuns.createdAt })
      .from(testRuns)
      .where(eq(testRuns.projectId, params.id))
      .orderBy(testRuns.createdAt)

    const runIds = runs.map((r) => r.id)

    // Calculate pass rate trend per run
    const runTrends = []
    let totalAllPassed = 0
    let totalAllFailed = 0
    let totalAllBlocked = 0
    let totalAllRetest = 0
    let totalAllUntested = 0

    for (const r of runs) {
      const rTests = await db.select({ id: tests.id }).from(tests).where(eq(tests.runId, r.id))
      let p = 0
      let f = 0
      let b = 0
      let re = 0
      let u = 0

      for (const t of rTests) {
        const [res] = await db
          .select({ statusId: results.statusId })
          .from(results)
          .where(eq(results.testId, t.id))
          .orderBy(desc(results.createdAt))
          .limit(1)

        const st = res ? res.statusId : 5
        if (st === 1) p++
        else if (st === 2) f++
        else if (st === 3) b++
        else if (st === 4) re++
        else u++
      }

      totalAllPassed += p
      totalAllFailed += f
      totalAllBlocked += b
      totalAllRetest += re
      totalAllUntested += u

      const total = rTests.length
      const passRate = total > 0 ? Math.round((p / total) * 100) : 0

      runTrends.push({
        runId: r.id,
        runName: r.name,
        date: r.createdAt.toISOString().split('T')[0],
        total,
        passed: p,
        failed: f,
        passRate,
      })
    }

    // Flaky tests detection (cases that have results with both 1 (passed) and 2 (failed))
    const flakyResults = await db
      .select({
        caseId: tests.caseId,
        caseTitle: sql<string>`(${tests.caseSnapshot}->>'title')`,
        caseCode: sql<string>`(${tests.caseSnapshot}->>'code')`,
        passedCount: sql<number>`count(case when ${results.statusId} = 1 then 1 end)`,
        failedCount: sql<number>`count(case when ${results.statusId} = 2 then 1 end)`,
      })
      .from(results)
      .innerJoin(tests, eq(results.testId, tests.id))
      .innerJoin(testRuns, eq(tests.runId, testRuns.id))
      .where(eq(testRuns.projectId, params.id))
      .groupBy(tests.caseId, sql`(${tests.caseSnapshot}->>'title')`, sql`(${tests.caseSnapshot}->>'code')`)
      .having(sql`count(case when ${results.statusId} = 1 then 1 end) > 0 AND count(case when ${results.statusId} = 2 then 1 end) > 0`)

    // Automation coverage
    const [{ totalCases }] = await db
      .select({ totalCases: sql<number>`count(*)` })
      .from(cases)
      .innerJoin(sections, eq(cases.sectionId, sections.id))
      .innerJoin(suites, eq(sections.suiteId, suites.id))
      .where(and(eq(suites.projectId, params.id), isNull(cases.deletedAt)))

    const [{ automatedCases }] = await db
      .select({ automatedCases: sql<number>`count(*)` })
      .from(cases)
      .innerJoin(sections, eq(cases.sectionId, sections.id))
      .innerJoin(suites, eq(sections.suiteId, suites.id))
      .where(
        and(
          eq(suites.projectId, params.id),
          eq(cases.automationStatus, 'automated'),
          isNull(cases.deletedAt)
        )
      )

    return success({
      totalRuns: runs.length,
      distribution: {
        passed: totalAllPassed,
        failed: totalAllFailed,
        blocked: totalAllBlocked,
        retest: totalAllRetest,
        untested: totalAllUntested,
      },
      coverage: {
        total: Number(totalCases),
        automated: Number(automatedCases),
        percentage: Number(totalCases) > 0 ? Math.round((Number(automatedCases) / Number(totalCases)) * 100) : 0,
      },
      runTrends,
      flakyTests: flakyResults,
    })
  })
