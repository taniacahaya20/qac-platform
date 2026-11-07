import { db } from '../../db'
import { cases, caseVersions, sections, suites, users, modules, tests } from '../../db/schema'
import { eq, and, sql, ilike, desc, isNull, inArray, or } from 'drizzle-orm'
import type { Static } from 'elysia'
import type { createCaseBody, updateCaseBody, filterCasesQuery } from './schema'
import { getNextTestCaseId } from '../modules/service'

export async function nextCaseCode(): Promise<string> {
  const result: any = await db.execute(sql`SELECT nextval('cases_code_seq') as val`)
  const rows = Array.isArray(result) ? result : (result?.rows ?? [])
  return `C${String(rows[0]?.val ?? 1).padStart(4, '0')}`
}

export async function getCases(projectId: string, query: Static<typeof filterCasesQuery>) {
  const {
    sectionId,
    moduleId,
    suiteId,
    priority,
    type,
    condition,
    automationStatus,
    search,
    page = 1,
    limit = 50,
  } = query

  const offset = (Number(page) - 1) * Number(limit)

  // Find all section IDs belonging to this project (or specific suite)
  let sectionIdsToMatch: string[] = []

  if (sectionId) {
    const allSections = await db.select({ id: sections.id, parentId: sections.parentId }).from(sections)
    const collectDescendants = (id: string): string[] => {
      const children = allSections.filter((s) => s.parentId === id).map((s) => s.id)
      return [id, ...children.flatMap(collectDescendants)]
    }
    sectionIdsToMatch = collectDescendants(sectionId)
  } else {
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
      sectionIdsToMatch = secRows.map((s) => s.id)
    }
  }

  if (sectionIdsToMatch.length === 0) {
    return {
      cases: [],
      meta: { page: Number(page), limit: Number(limit), total: 0, totalPages: 0 },
    }
  }

  const conditions = [
    isNull(cases.deletedAt),
    inArray(cases.sectionId, sectionIdsToMatch),
  ]

  if (moduleId) {
    conditions.push(eq(cases.moduleId, moduleId))
  }
  if (priority) {
    conditions.push(eq(cases.priority, priority as any))
  }
  if (type) {
    conditions.push(eq(cases.type, type as any))
  }
  if (condition) {
    conditions.push(eq(cases.condition, condition))
  }
  if (automationStatus) {
    conditions.push(eq(cases.automationStatus, automationStatus as any))
  }
  if (search) {
    conditions.push(
      or(
        ilike(cases.title, `%${search}%`),
        ilike(cases.code, `%${search}%`),
        ilike(cases.actor, `%${search}%`),
        ilike(cases.automationKey, `%${search}%`)
      )!
    )
  }

  const whereClause = and(...conditions)

  const rows = await db
    .select({
      id: cases.id,
      code: cases.code,
      sectionId: cases.sectionId,
      sectionName: sections.name,
      moduleId: cases.moduleId,
      moduleName: modules.name,
      moduleCode: modules.code,
      actor: cases.actor,
      condition: cases.condition,
      title: cases.title,
      description: cases.description,
      type: cases.type,
      priority: cases.priority,
      template: cases.template,
      preconditions: cases.preconditions,
      steps: cases.steps,
      expectedResult: cases.expectedResult,
      testData: cases.testData,
      statusData: cases.statusData,
      actualResult: cases.actualResult,
      notes: cases.notes,
      estimate: cases.estimate,
      refs: cases.refs,
      automationStatus: cases.automationStatus,
      automationKey: cases.automationKey,
      labels: cases.labels,
      createdByName: users.name,
      isLocked: sql<boolean>`EXISTS (SELECT 1 FROM tests t WHERE t.case_id = ${cases.id})`,
      runCount: sql<number>`(SELECT count(*)::int FROM tests t WHERE t.case_id = ${cases.id})`,
      createdAt: cases.createdAt,
      updatedAt: cases.updatedAt,
    })
    .from(cases)
    .innerJoin(sections, eq(cases.sectionId, sections.id))
    .innerJoin(users, eq(cases.createdBy, users.id))
    .leftJoin(modules, eq(cases.moduleId, modules.id))
    .where(whereClause)
    .orderBy(desc(cases.createdAt))
    .limit(Number(limit))
    .offset(offset)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cases)
    .where(whereClause)

  const total = Number(count)

  return {
    cases: rows,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  }
}

export async function getCaseById(id: string) {
  const [c] = await db
    .select({
      id: cases.id,
      code: cases.code,
      sectionId: cases.sectionId,
      sectionName: sections.name,
      moduleId: cases.moduleId,
      moduleName: modules.name,
      moduleCode: modules.code,
      actor: cases.actor,
      condition: cases.condition,
      title: cases.title,
      description: cases.description,
      type: cases.type,
      priority: cases.priority,
      template: cases.template,
      preconditions: cases.preconditions,
      steps: cases.steps,
      expectedResult: cases.expectedResult,
      testData: cases.testData,
      statusData: cases.statusData,
      actualResult: cases.actualResult,
      notes: cases.notes,
      estimate: cases.estimate,
      refs: cases.refs,
      automationStatus: cases.automationStatus,
      automationKey: cases.automationKey,
      labels: cases.labels,
      createdBy: cases.createdBy,
      createdByName: users.name,
      isLocked: sql<boolean>`EXISTS (SELECT 1 FROM tests t WHERE t.case_id = ${cases.id})`,
      runCount: sql<number>`(SELECT count(*)::int FROM tests t WHERE t.case_id = ${cases.id})`,
      createdAt: cases.createdAt,
      updatedAt: cases.updatedAt,
    })
    .from(cases)
    .innerJoin(sections, eq(cases.sectionId, sections.id))
    .innerJoin(users, eq(cases.createdBy, users.id))
    .leftJoin(modules, eq(cases.moduleId, modules.id))
    .where(and(eq(cases.id, id), isNull(cases.deletedAt)))
    .limit(1)

  if (!c) return null

  // Fetch version history
  const versions = await db
    .select({
      id: caseVersions.id,
      snapshot: caseVersions.snapshot,
      createdAt: caseVersions.createdAt,
      changedByName: users.name,
    })
    .from(caseVersions)
    .innerJoin(users, eq(caseVersions.changedBy, users.id))
    .where(eq(caseVersions.caseId, id))
    .orderBy(desc(caseVersions.createdAt))
    .limit(10)

  return { ...c, versions }
}

export async function createCase(userId: string, projectId: string, data: Static<typeof createCaseBody>) {
  let code = data.code?.trim()
  if (!code) {
    if (data.moduleId) {
      code = await getNextTestCaseId(data.moduleId, projectId)
    } else {
      code = await nextCaseCode()
    }
  }

  // Ensure unique code in database
  let candidateCode = code
  let counter = 1
  while (true) {
    const [existing] = await db
      .select({ id: cases.id })
      .from(cases)
      .where(eq(cases.code, candidateCode))
      .limit(1)
    if (!existing) {
      code = candidateCode
      break
    }
    const prefix = candidateCode.includes('-') ? candidateCode.split('-')[0] : 'TC'
    candidateCode = `${prefix}-${String(counter++).padStart(3, '0')}`
  }

  // Ensure valid sectionId (auto-create default suite & section if project has none)
  let targetSectionId = data.sectionId
  if (!targetSectionId) {
    const [firstSec] = await db
      .select({ id: sections.id })
      .from(sections)
      .innerJoin(suites, eq(sections.suiteId, suites.id))
      .where(eq(suites.projectId, projectId))
      .limit(1)
    targetSectionId = firstSec?.id
  }

  if (!targetSectionId) {
    let [defSuite] = await db.select().from(suites).where(eq(suites.projectId, projectId)).limit(1)
    if (!defSuite) {
      const [newSuite] = await db
        .insert(suites)
        .values({
          projectId,
          name: 'Master Suite',
          isDefault: true,
        })
        .returning()
      defSuite = newSuite
    }

    const [newSec] = await db
      .insert(sections)
      .values({
        suiteId: defSuite.id,
        name: 'Umum',
        description: 'Section default untuk kasus uji',
      })
      .returning()
    targetSectionId = newSec.id
  }

  const [newCase] = await db
    .insert(cases)
    .values({
      code,
      sectionId: targetSectionId,
      moduleId: data.moduleId || null,
      actor: data.actor?.trim(),
      condition: data.condition?.trim(),
      title: data.title.trim(),
      description: data.description?.trim(),
      type: data.type ?? 'Functional',
      priority: data.priority ?? 'Medium',
      template: data.template ?? 'steps',
      preconditions: data.preconditions?.trim(),
      steps: data.steps,
      expectedResult: data.expectedResult?.trim(),
      testData: data.testData?.trim(),
      statusData: data.statusData || 'Untested',
      actualResult: data.actualResult?.trim() || null,
      notes: data.notes?.trim(),
      estimate: data.estimate,
      refs: data.refs,
      automationStatus: data.automationStatus ?? 'manual',
      automationKey: data.automationKey,
      labels: data.labels,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning()

  // Save initial version snapshot
  await db.insert(caseVersions).values({
    caseId: newCase.id,
    snapshot: newCase as unknown as Record<string, unknown>,
    changedBy: userId,
  })

  return newCase
}

export async function updateCase(id: string, userId: string, data: Static<typeof updateCaseBody>) {
  // Cek apakah kasus uji sudah pernah masuk dalam Run Case
  const runCheck = await db
    .select({ count: sql<number>`count(*)` })
    .from(tests)
    .where(eq(tests.caseId, id))

  if (Number(runCheck[0]?.count ?? 0) > 0) {
    const err: any = new Error('Kasus uji tidak dapat diedit karena sudah masuk dalam Run Case.')
    err.code = 'CASE_LOCKED'
    throw err
  }

  const updateData: any = {
    updatedBy: userId,
    updatedAt: new Date(),
  }

  if (data.sectionId !== undefined) updateData.sectionId = data.sectionId
  if (data.moduleId !== undefined) updateData.moduleId = data.moduleId
  if (data.actor !== undefined) updateData.actor = data.actor
  if (data.condition !== undefined) updateData.condition = data.condition
  if (data.code !== undefined) updateData.code = data.code
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.type !== undefined) updateData.type = data.type
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.template !== undefined) updateData.template = data.template
  if (data.preconditions !== undefined) updateData.preconditions = data.preconditions
  if (data.steps !== undefined) updateData.steps = data.steps
  if (data.expectedResult !== undefined) updateData.expectedResult = data.expectedResult
  if (data.testData !== undefined) updateData.testData = data.testData
  if (data.statusData !== undefined) updateData.statusData = data.statusData
  if (data.actualResult !== undefined) updateData.actualResult = data.actualResult
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.estimate !== undefined) updateData.estimate = data.estimate
  if (data.refs !== undefined) updateData.refs = data.refs
  if (data.automationStatus !== undefined) updateData.automationStatus = data.automationStatus
  if (data.automationKey !== undefined) updateData.automationKey = data.automationKey
  if (data.labels !== undefined) updateData.labels = data.labels

  const [updated] = await db
    .update(cases)
    .set(updateData)
    .where(and(eq(cases.id, id), isNull(cases.deletedAt)))
    .returning()

  if (updated) {
    await db.insert(caseVersions).values({
      caseId: updated.id,
      snapshot: updated as unknown as Record<string, unknown>,
      changedBy: userId,
    })
  }

  return updated
}

export async function deleteCase(id: string, userId: string) {
  const [deleted] = await db
    .update(cases)
    .set({
      deletedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(cases.id, id))
    .returning()

  return !!deleted
}
