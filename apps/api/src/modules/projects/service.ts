import { db } from '../../db'
import { projects, projectMembers } from '../../db/schema'
import { eq, and, inArray } from 'drizzle-orm'

export async function getProjectsForUser(userId: string, role: string) {
  if (role === 'admin') {
    return await db.select().from(projects).orderBy(projects.createdAt)
  }
  const memberRows = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId))
  if (memberRows.length === 0) return []
  const projectIds = memberRows.map((r) => r.projectId)
  return await db.select().from(projects).where(inArray(projects.id, projectIds)).orderBy(projects.createdAt)
}

export async function getProjectById(projectId: string) {
  const [p] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  return p ?? null
}

export async function isProjectMember(projectId: string, userId: string, role: string) {
  if (role === 'admin') return true
  const [m] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1)
  return !!m
}
