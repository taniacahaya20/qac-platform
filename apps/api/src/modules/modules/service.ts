import { db } from '../../db'
import { modules, cases } from '../../db/schema'
import { eq, and, sql, desc, isNull } from 'drizzle-orm'
import type { CreateModuleInput, UpdateModuleInput } from './schema'

export function generateModuleCode(name: string): string {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9\s]/g, '')
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'MOD'
  if (words.length === 1) {
    return words[0].slice(0, 4).toUpperCase()
  }
  if (words.length === 2) {
    // e.g. "User Authentication" -> "AUTH" if second word is long, or "UATH"
    if (words[1].length >= 4) {
      return words[1].slice(0, 4).toUpperCase()
    }
    return (words[0].slice(0, 2) + words[1].slice(0, 2)).toUpperCase()
  }
  return words.map(w => w[0]).join('').slice(0, 4).toUpperCase()
}

export async function getProjectModules(projectId: string) {
  const rows = await db
    .select({
      id: modules.id,
      projectId: modules.projectId,
      name: modules.name,
      code: modules.code,
      description: modules.description,
      createdAt: modules.createdAt,
      updatedAt: modules.updatedAt,
      caseCount: sql<number>`count(${cases.id})::int`,
    })
    .from(modules)
    .leftJoin(cases, and(eq(cases.moduleId, modules.id), isNull(cases.deletedAt)))
    .where(eq(modules.projectId, projectId))
    .groupBy(modules.id)
    .orderBy(modules.name)

  return rows
}

export async function getModuleById(id: string) {
  const [row] = await db.select().from(modules).where(eq(modules.id, id)).limit(1)
  return row ?? null
}

export async function createModule(projectId: string, data: CreateModuleInput) {
  const code = (data.code?.trim() || generateModuleCode(data.name)).toUpperCase()
  const [created] = await db
    .insert(modules)
    .values({
      projectId,
      name: data.name.trim(),
      code,
      description: data.description?.trim(),
    })
    .returning()

  return created
}

export async function updateModule(id: string, data: UpdateModuleInput) {
  const updateData: any = { updatedAt: new Date() }
  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.code !== undefined) updateData.code = data.code.trim().toUpperCase()
  if (data.description !== undefined) updateData.description = data.description?.trim()

  const [updated] = await db
    .update(modules)
    .set(updateData)
    .where(eq(modules.id, id))
    .returning()

  return updated ?? null
}

export async function deleteModule(id: string) {
  await db.delete(modules).where(eq(modules.id, id))
}

export async function getNextTestCaseId(moduleId: string, projectId: string): Promise<string> {
  const [mod] = await db.select().from(modules).where(eq(modules.id, moduleId)).limit(1)
  if (!mod) {
    return 'TC-001'
  }

  // Find cases with this module or with code starting with mod.code
  const prefix = `${mod.code}-`
  const rows = await db
    .select({ code: cases.code })
    .from(cases)
    .where(and(eq(cases.moduleId, moduleId), isNull(cases.deletedAt)))

  let maxSeq = 0
  for (const r of rows) {
    if (r.code && r.code.startsWith(prefix)) {
      const numPart = parseInt(r.code.slice(prefix.length), 10)
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart
      }
    }
  }

  // If no prefix match, fallback to count + 1
  if (maxSeq === 0 && rows.length > 0) {
    maxSeq = rows.length
  }

  const nextNum = String(maxSeq + 1).padStart(3, '0')
  return `${mod.code}-${nextNum}`
}
