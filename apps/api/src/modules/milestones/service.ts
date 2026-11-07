import { db } from '../../db'
import { milestones, testRuns, tests, results } from '../../db/schema'
import { eq, and, desc, sql, inArray } from 'drizzle-orm'
import type { Static } from 'elysia'
import type { createMilestoneBody, updateMilestoneBody } from './schema'

export async function getProjectMilestones(projectId: string) {
  const rows = await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(desc(milestones.createdAt))

  const resultsWithProgress = []
  for (const m of rows) {
    // Get all runs linked to this milestone
    const linkedRuns = await db
      .select({ id: testRuns.id })
      .from(testRuns)
      .where(eq(testRuns.milestoneId, m.id))

    let totalTests = 0
    let passedTests = 0

    if (linkedRuns.length > 0) {
      const rIds = linkedRuns.map((r) => r.id)
      const testRows = await db
        .select({ id: tests.id })
        .from(tests)
        .where(inArray(tests.runId, rIds))

      totalTests = testRows.length
      for (const t of testRows) {
        const [latest] = await db
          .select({ statusId: results.statusId })
          .from(results)
          .where(eq(results.testId, t.id))
          .orderBy(desc(results.createdAt))
          .limit(1)

        if (latest && latest.statusId === 1) passedTests++
      }
    }

    const percent = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0

    resultsWithProgress.push({
      ...m,
      runCount: linkedRuns.length,
      totalTests,
      passedTests,
      percent,
    })
  }

  return resultsWithProgress
}

export async function createMilestone(projectId: string, data: Static<typeof createMilestoneBody>) {
  const [created] = await db
    .insert(milestones)
    .values({
      projectId,
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      dueDate: data.dueDate,
      parentId: data.parentId || null,
    })
    .returning()
  return created
}

export async function updateMilestone(id: string, data: Static<typeof updateMilestoneBody>) {
  const [updated] = await db
    .update(milestones)
    .set({
      ...data,
      completedAt: data.isCompleted ? new Date() : null,
    })
    .where(eq(milestones.id, id))
    .returning()
  return updated
}

export async function deleteMilestone(id: string) {
  await db.delete(milestones).where(eq(milestones.id, id))
  return true
}
