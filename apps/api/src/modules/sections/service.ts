import { db } from '../../db'
import { sections, suites, cases } from '../../db/schema'
import { eq, and, sql, asc, isNull } from 'drizzle-orm'

export interface SectionNode {
  id: string
  suiteId: string
  parentId: string | null
  name: string
  description: string | null
  sortOrder: number
  depth: number
  caseCount: number
  children: SectionNode[]
}

export async function getDefaultSuiteForProject(projectId: string) {
  const [suite] = await db
    .select()
    .from(suites)
    .where(and(eq(suites.projectId, projectId), eq(suites.isDefault, true)))
    .limit(1)

  if (suite) return suite

  // If no default suite, return first suite or create one
  const [firstSuite] = await db
    .select()
    .from(suites)
    .where(eq(suites.projectId, projectId))
    .limit(1)

  if (firstSuite) return firstSuite

  const [newSuite] = await db
    .insert(suites)
    .values({
      projectId,
      name: 'Master Suite',
      isDefault: true,
    })
    .returning()

  return newSuite
}

export async function getProjectSections(projectId: string, suiteId?: string): Promise<SectionNode[]> {
  const targetSuite = suiteId
    ? { id: suiteId }
    : await getDefaultSuiteForProject(projectId)

  // Get all sections for this suite
  const sectionRows = await db
    .select({
      id: sections.id,
      suiteId: sections.suiteId,
      parentId: sections.parentId,
      name: sections.name,
      description: sections.description,
      sortOrder: sections.sortOrder,
      depth: sections.depth,
      caseCount: sql<number>`(
        SELECT count(*)::int FROM cases 
        WHERE cases.section_id = ${sections.id} 
        AND cases.deleted_at IS NULL
      )`,
    })
    .from(sections)
    .where(eq(sections.suiteId, targetSuite.id))
    .orderBy(asc(sections.sortOrder), asc(sections.name))

  // Build tree
  const map = new Map<string, SectionNode>()
  const roots: SectionNode[] = []

  for (const row of sectionRows) {
    map.set(row.id, {
      ...row,
      caseCount: Number(row.caseCount || 0),
      children: [],
    })
  }

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export async function createSection(data: {
  suiteId: string
  parentId?: string | null
  name: string
  description?: string
  sortOrder?: number
}) {
  let depth = 0
  if (data.parentId) {
    const [parent] = await db
      .select({ depth: sections.depth })
      .from(sections)
      .where(eq(sections.id, data.parentId))
      .limit(1)
    if (parent) {
      depth = parent.depth + 1
    }
  }

  const [newSection] = await db
    .insert(sections)
    .values({
      suiteId: data.suiteId,
      parentId: data.parentId ?? null,
      name: data.name,
      description: data.description,
      sortOrder: data.sortOrder ?? 0,
      depth,
    })
    .returning()

  return newSection
}

export async function updateSection(id: string, data: Partial<{
  name: string
  description: string | null
  parentId: string | null
  sortOrder: number
}>) {
  let depth: number | undefined
  if (data.parentId !== undefined) {
    if (data.parentId) {
      const [parent] = await db
        .select({ depth: sections.depth })
        .from(sections)
        .where(eq(sections.id, data.parentId))
        .limit(1)
      if (parent) depth = parent.depth + 1
    } else {
      depth = 0
    }
  }

  const [updated] = await db
    .update(sections)
    .set({
      ...data,
      ...(depth !== undefined ? { depth } : {}),
    })
    .where(eq(sections.id, id))
    .returning()

  return updated
}

export async function deleteSection(id: string) {
  // Check if has child sections or cases
  await db.delete(sections).where(eq(sections.id, id))
  return true
}
