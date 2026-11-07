import { db } from '../../db'
import {
  testRuns,
  tests,
  results,
  statuses,
  cases,
  sections,
  suites,
  users,
  milestones,
  issues,
  projects,
} from '../../db/schema'
import { eq, and, desc, sql, inArray, isNull, count } from 'drizzle-orm'
import type { Static } from 'elysia'
import type { createRunBody, addResultBody } from './schema'
import { sendLarkNotification, createLarkTaskTicket } from '../../lib/lark'

export async function getProjectRuns(projectId: string) {
  const runs = await db
    .select({
      id: testRuns.id,
      projectId: testRuns.projectId,
      milestoneId: testRuns.milestoneId,
      milestoneName: milestones.name,
      name: testRuns.name,
      description: testRuns.description,
      assignedTo: testRuns.assignedTo,
      assignedToName: users.name,
      includeAll: testRuns.includeAll,
      isCompleted: testRuns.isCompleted,
      completedAt: testRuns.completedAt,
      source: testRuns.source,
      ciInfo: testRuns.ciInfo,
      createdAt: testRuns.createdAt,
      updatedAt: testRuns.updatedAt,
    })
    .from(testRuns)
    .leftJoin(users, eq(testRuns.assignedTo, users.id))
    .leftJoin(milestones, eq(testRuns.milestoneId, milestones.id))
    .where(eq(testRuns.projectId, projectId))
    .orderBy(desc(testRuns.createdAt))

  // For each run, calculate stats
  const resultRuns = []
  for (const r of runs) {
    const runTests = await db
      .select({
        id: tests.id,
      })
      .from(tests)
      .where(eq(tests.runId, r.id))

    const testIds = runTests.map((t) => t.id)
    let passed = 0
    let failed = 0
    let blocked = 0
    let retest = 0
    let untested = 0

    if (testIds.length > 0) {
      // Find latest result for each test
      for (const tId of testIds) {
        const [latestResult] = await db
          .select({ statusId: results.statusId })
          .from(results)
          .where(eq(results.testId, tId))
          .orderBy(desc(results.createdAt))
          .limit(1)

        const statusId = latestResult ? latestResult.statusId : 5 // 5 = Untested
        if (statusId === 1) passed++
        else if (statusId === 2) failed++
        else if (statusId === 3) blocked++
        else if (statusId === 4) retest++
        else untested++
      }
    }

    const total = testIds.length
    const tested = passed + failed + blocked + retest
    const percent = total > 0 ? Math.round((passed / total) * 100) : 0

    resultRuns.push({
      ...r,
      stats: {
        total,
        passed,
        failed,
        blocked,
        retest,
        untested,
        percent,
      },
    })
  }

  return resultRuns
}

export async function getRunDetail(runId: string) {
  const [run] = await db
    .select({
      id: testRuns.id,
      projectId: testRuns.projectId,
      milestoneId: testRuns.milestoneId,
      milestoneName: milestones.name,
      name: testRuns.name,
      description: testRuns.description,
      assignedTo: testRuns.assignedTo,
      assignedToName: users.name,
      includeAll: testRuns.includeAll,
      isCompleted: testRuns.isCompleted,
      completedAt: testRuns.completedAt,
      source: testRuns.source,
      ciInfo: testRuns.ciInfo,
      createdAt: testRuns.createdAt,
      larkWebhookUrl: projects.larkWebhookUrl,
      larkAppId: projects.larkAppId,
      larkAppSecret: projects.larkAppSecret,
      larkTasklistGuid: projects.larkTasklistGuid,
    })
    .from(testRuns)
    .leftJoin(users, eq(testRuns.assignedTo, users.id))
    .leftJoin(milestones, eq(testRuns.milestoneId, milestones.id))
    .leftJoin(projects, eq(testRuns.projectId, projects.id))
    .where(eq(testRuns.id, runId))
    .limit(1)

  if (!run) return null

  // Get tests
  const testRows = await db
    .select({
      id: tests.id,
      caseId: tests.caseId,
      assignedTo: tests.assignedTo,
      assignedToName: users.name,
      caseSnapshot: tests.caseSnapshot,
      sortOrder: tests.sortOrder,
    })
    .from(tests)
    .leftJoin(users, eq(tests.assignedTo, users.id))
    .where(eq(tests.runId, runId))
    .orderBy(tests.sortOrder)

  // Attach latest result & results history for each test
  const fullTests = []
  let passed = 0
  let failed = 0
  let blocked = 0
  let retest = 0
  let untested = 0

  for (const t of testRows) {
    const history = await db
      .select({
        id: results.id,
        statusId: results.statusId,
        statusName: statuses.name,
        statusLabel: statuses.label,
        statusColor: statuses.color,
        comment: results.comment,
        elapsed: results.elapsed,
        defects: results.defects,
        isAutomated: results.isAutomated,
        errorMessage: results.errorMessage,
        stackTrace: results.stackTrace,
        createdByName: users.name,
        createdAt: results.createdAt,
      })
      .from(results)
      .innerJoin(statuses, eq(results.statusId, statuses.id))
      .innerJoin(users, eq(results.createdBy, users.id))
      .where(eq(results.testId, t.id))
      .orderBy(desc(results.createdAt))

    const latest = history[0] ?? null
    const currentStatusId = latest ? latest.statusId : 5
    if (currentStatusId === 1) passed++
    else if (currentStatusId === 2) failed++
    else if (currentStatusId === 3) blocked++
    else if (currentStatusId === 4) retest++
    else untested++

    fullTests.push({
      ...t,
      latestResult: latest,
      history,
    })
  }

  const total = fullTests.length
  const percent = total > 0 ? Math.round((passed / total) * 100) : 0

  return {
    run: {
      ...run,
      stats: { total, passed, failed, blocked, retest, untested, percent },
    },
    tests: fullTests,
  }
}

export async function createRun(projectId: string, userId: string, data: Static<typeof createRunBody>) {
  const [newRun] = await db
    .insert(testRuns)
    .values({
      projectId,
      name: data.name,
      description: data.description,
      milestoneId: data.milestoneId || null,
      assignedTo: data.assignedTo || null,
      includeAll: data.includeAll ?? true,
      source: 'manual',
      createdBy: userId,
    })
    .returning()

  // Select cases to include
  let casesToInclude: Array<typeof cases.$inferSelect> = []

  if (data.includeAll || !data.caseIds || data.caseIds.length === 0) {
    // Get all cases of this project
    const suiteRows = await db
      .select({ id: suites.id })
      .from(suites)
      .where(eq(suites.projectId, projectId))
    const sIds = suiteRows.map((s) => s.id)

    if (sIds.length > 0) {
      const secRows = await db
        .select({ id: sections.id })
        .from(sections)
        .where(inArray(sections.suiteId, sIds))
      const secIds = secRows.map((s) => s.id)

      if (secIds.length > 0) {
        casesToInclude = await db
          .select()
          .from(cases)
          .where(and(inArray(cases.sectionId, secIds), isNull(cases.deletedAt)))
      }
    }
  } else {
    casesToInclude = await db
      .select()
      .from(cases)
      .where(and(inArray(cases.id, data.caseIds), isNull(cases.deletedAt)))
  }

  // Populate tests
  for (let i = 0; i < casesToInclude.length; i++) {
    const c = casesToInclude[i]
    await db.insert(tests).values({
      runId: newRun.id,
      caseId: c.id,
      assignedTo: data.assignedTo || null,
      caseSnapshot: c as unknown as Record<string, unknown>,
      sortOrder: i,
    })
  }

  return newRun
}

export async function addTestResult(testId: string, userId: string, data: Static<typeof addResultBody>) {
  const [newResult] = await db
    .insert(results)
    .values({
      testId,
      statusId: data.statusId,
      comment: data.comment,
      elapsed: data.elapsed,
      defects: data.defects,
      version: data.version,
      createdBy: userId,
    })
    .returning()

  // Otomatisasi Antrian Issue Dev jika status Failed (statusId === 2)
  if (data.statusId === 2) {
    try {
      const [testRecord] = await db.select().from(tests).where(eq(tests.id, testId))
      if (testRecord) {
        const [runRecord] = await db.select().from(testRuns).where(eq(testRuns.id, testRecord.runId))
        if (runRecord) {
          const existingIssues = await db.select().from(issues).where(eq(issues.testId, testId))
          const snap = (testRecord.caseSnapshot ?? {}) as Record<string, any>
          if (existingIssues.length > 0) {
            await db
              .update(issues)
              .set({
                status: 'open',
                description: data.comment || existingIssues[0].description,
                actualResult: data.comment || existingIssues[0].actualResult,
                priority: data.priority || existingIssues[0].priority,
                assignedToName: data.assignedToName || existingIssues[0].assignedToName,
                updatedAt: new Date(),
              })
              .where(eq(issues.id, existingIssues[0].id))
          } else {
            const countRes = await db
              .select({ count: count() })
              .from(issues)
              .where(eq(issues.projectId, runRecord.projectId))
            const num = Number(countRes[0]?.count ?? 0) + 1
            const code = `ISS-${String(num).padStart(3, '0')}`
            await db.insert(issues).values({
              projectId: runRecord.projectId,
              runId: runRecord.id,
              testId: testRecord.id,
              caseId: testRecord.caseId,
              code,
              title: `[FAIL] ${snap.code || 'CASE'}: ${snap.title || 'Kasus Uji'}`,
              description: data.comment || 'Hasil pengujian gagal pada saat eksekusi test run.',
              actualResult: data.comment || 'Pengujian tidak memenuhi hasil yang diharapkan.',
              priority: data.priority || snap.priority || 'High',
              severity: data.severity || 'Major',
              status: 'open',
              assignedToName: data.assignedToName || null,
              createdBy: userId,
            })
          }
        }
      }
    } catch (err) {
      console.error('Error queuing developer issue for failed test:', err)
    }
  } else if (data.statusId === 1) {
    // Jika kemudian Lulus (Passed), tandai issue terkait sebagai resolved
    try {
      const existingIssues = await db.select().from(issues).where(eq(issues.testId, testId))
      if (existingIssues.length > 0 && existingIssues[0].status !== 'closed') {
        await db
          .update(issues)
          .set({
            status: 'resolved',
            devNotes:
              (existingIssues[0].devNotes ? existingIssues[0].devNotes + '\n' : '') +
              `[QA]: Kasus uji telah LULUS (Passed) pada pengujian ulang (${new Date().toLocaleString('id-ID')}).`,
            updatedAt: new Date(),
          })
          .where(eq(issues.id, existingIssues[0].id))
      }
    } catch (err) {
      console.error('Error updating issue resolution:', err)
    }
  }

  // Push ke Lark Bot Webhook & Buat Tiket di Lark Task jika status FAILED (statusId === 2) atau BLOCKED (statusId === 3)
  let larkResult: { success: boolean; error?: string } | null = null
  let larkTaskResult: { success: boolean; taskGuid?: string; taskUrl?: string; error?: string } | null = null

  if (data.statusId === 2 || data.statusId === 3) {
    try {
      const [testRecord] = await db.select().from(tests).where(eq(tests.id, testId))
      if (testRecord) {
        const [runRecord] = await db.select().from(testRuns).where(eq(testRuns.id, testRecord.runId))
        if (runRecord) {
          const [projectRecord] = await db.select().from(projects).where(eq(projects.id, runRecord.projectId))
          const [userRecord] = await db.select().from(users).where(eq(users.id, userId))
          const snap = (testRecord.caseSnapshot ?? {}) as Record<string, any>

          // 1. Lark Chat Webhook Notification
          const webhookUrl =
            data.larkWebhookUrl ||
            projectRecord?.larkWebhookUrl ||
            process.env.LARK_WEBHOOK_URL ||
            ''

          if (webhookUrl && data.pushToLark !== false) {
            console.log(`[Lark] Mengirim notifikasi ${data.statusId === 2 ? 'FAILED' : 'BLOCKED'} ke Lark webhook...`)
            larkResult = await sendLarkNotification({
              webhookUrl,
              projectName: projectRecord?.name || 'Proyek TMS Karlo',
              runName: runRecord.name,
              caseCode: snap.code || 'CASE',
              caseTitle: snap.title || 'Kasus Uji',
              actor: snap.actor || 'Superadmin',
              condition: snap.condition || 'Positif Case',
              status: data.statusId === 2 ? 'FAILED' : 'BLOCKED',
              comment: data.comment || undefined,
              defects: data.defects || undefined,
              priority: data.priority || snap.priority || 'High',
              testerName: userRecord?.name || 'QA Tester',
              runUrl: `http://localhost:3000/projects/${runRecord.projectId}/runs/${runRecord.id}`,
            })
            console.log('[Lark] Hasil push notifikasi:', larkResult)

            if (data.larkWebhookUrl && projectRecord && !projectRecord.larkWebhookUrl) {
              await db
                .update(projects)
                .set({ larkWebhookUrl: data.larkWebhookUrl })
                .where(eq(projects.id, projectRecord.id))
            }
          }

          // 2. Lark Task Creation (Ticketing di Task List dengan status awal Todo)
          const appId = data.larkAppId || projectRecord?.larkAppId || process.env.LARK_APP_ID || ''
          const appSecret = data.larkAppSecret || projectRecord?.larkAppSecret || process.env.LARK_APP_SECRET || ''

          if (data.createLarkTask !== false && appId && appSecret) {
            console.log('[Lark Task] Membuat Tiket Baru di Lark Tasks (Task List)...')
            const projectTasklist = projectRecord?.larkTasklistGuid || 'ebb40d04-7580-4039-8ab3-bf58fff5f81f'
            larkTaskResult = await createLarkTaskTicket({
              appId,
              appSecret,
              tasklistGuid: projectTasklist,
              projectName: projectRecord?.name || 'TMS Karlo',
              issueCode: `ISS-${String(new Date().getMinutes()).padStart(2, '0')}`,
              caseCode: snap.code || 'CASE',
              caseTitle: snap.title || 'Kasus Uji',
              actor: snap.actor || 'Superadmin',
              condition: snap.condition || 'Positif Case',
              priority: data.priority || snap.priority || 'High',
              severity: data.severity || 'Major',
              status: data.statusId === 2 ? 'FAILED' : 'BLOCKED',
              comment: data.comment || undefined,
              testerName: userRecord?.name || 'QA Tester',
              runUrl: `http://localhost:3000/projects/${runRecord.projectId}/runs/${runRecord.id}`,
            })
            console.log('[Lark Task] Hasil pembuatan tiket:', larkTaskResult)

            if (larkTaskResult.tasklistGuid && projectRecord && projectRecord.larkTasklistGuid !== larkTaskResult.tasklistGuid) {
              await db
                .update(projects)
                .set({
                  larkAppId: appId,
                  larkAppSecret: appSecret,
                  larkTasklistGuid: larkTaskResult.tasklistGuid,
                })
                .where(eq(projects.id, projectRecord.id))
            }
          }
        }
      }
    } catch (larkErr) {
      console.error('Error handling Lark notifications and tasks:', larkErr)
    }
  }

  return {
    ...newResult,
    lark: larkResult,
    larkTask: larkTaskResult,
  }
}

export async function getRunIssues(runId: string) {
  return await db
    .select()
    .from(issues)
    .where(eq(issues.runId, runId))
    .orderBy(desc(issues.createdAt))
}

export async function updateIssue(
  issueId: string,
  data: { status?: string; devNotes?: string; assignedToName?: string; priority?: string }
) {
  const [updated] = await db
    .update(issues)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(issues.id, issueId))
    .returning()
  return updated
}

export async function closeRun(runId: string) {
  const [updated] = await db
    .update(testRuns)
    .set({
      isCompleted: true,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(testRuns.id, runId))
    .returning()

  return updated
}

export async function rerunFailed(runId: string, userId: string) {
  const detail = await getRunDetail(runId)
  if (!detail) return null

  // Filter tests that are Failed (2) or Retest (4) or Blocked (3)
  const failedTests = detail.tests.filter(
    (t) => t.latestResult && [2, 3, 4].includes(t.latestResult.statusId)
  )

  const caseIds = failedTests.map((t) => t.caseId)

  // Create new run
  const newRun = await createRun(detail.run.projectId, userId, {
    name: `Re-run: ${detail.run.name}`,
    description: `Re-run hasil gagal/retest dari run sebelumnya (${detail.run.name})`,
    milestoneId: detail.run.milestoneId,
    assignedTo: detail.run.assignedTo,
    includeAll: false,
    caseIds,
  })

  return newRun
}
