import { Elysia, t } from 'elysia'
import { db } from '../../db'
import { projects, projectMembers, users } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { authGuard } from '../../plugins/auth-guard'
import { createProjectBody, updateProjectBody } from './schema'
import { getProjectsForUser, getProjectById, isProjectMember } from './service'
import { success, errorResponse } from '../../lib/response'
import { logActivity } from '../../lib/activity'

export const projectRoutes = new Elysia({ prefix: '/projects' })
  .use(authGuard)
  .get('/', async ({ currentUser }) => {
    const data = await getProjectsForUser(currentUser.id, currentUser.role)
    return success(data)
  })
  .post(
    '/',
    async ({ currentUser, body, set }) => {
      if (currentUser.role === 'viewer') {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Tidak memiliki izin membuat project')
      }
      const [project] = await db
        .insert(projects)
        .values({ ...body, createdBy: currentUser.id })
        .returning()

      if (currentUser.role !== 'admin') {
        await db.insert(projectMembers).values({
          projectId: project.id,
          userId: currentUser.id,
          role: 'lead',
        })
      }

      await logActivity({
        projectId: project.id,
        userId: currentUser.id,
        action: 'create',
        entity: 'project',
        entityId: project.id,
        meta: { name: project.name },
      })
      set.status = 201
      return success(project)
    },
    { body: createProjectBody }
  )
  .get('/:id', async ({ params, currentUser, set }) => {
    const project = await getProjectById(params.id)
    if (!project) {
      set.status = 404
      return errorResponse('NOT_FOUND', 'Project tidak ditemukan')
    }
    const isMember = await isProjectMember(params.id, currentUser.id, currentUser.role)
    if (!isMember) {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Bukan anggota project ini')
    }

    const members = await db
      .select({
        userId: projectMembers.userId,
        role: projectMembers.role,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, params.id))

    return success({ ...project, members })
  })
  .patch(
    '/:id',
    async ({ params, currentUser, body, set }) => {
      const project = await getProjectById(params.id)
      if (!project) {
        set.status = 404
        return errorResponse('NOT_FOUND', 'Project tidak ditemukan')
      }
      const isMember = await isProjectMember(params.id, currentUser.id, currentUser.role)
      if (!isMember) {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Bukan anggota project ini')
      }
      if (currentUser.role === 'tester' || currentUser.role === 'viewer') {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Tidak memiliki izin edit project')
      }

      const [updated] = await db
        .update(projects)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(projects.id, params.id))
        .returning()

      await logActivity({
        projectId: params.id,
        userId: currentUser.id,
        action: 'update',
        entity: 'project',
        entityId: params.id,
        meta: body as Record<string, unknown>,
      })
      return success(updated)
    },
    { body: updateProjectBody }
  )
  .delete('/:id', async ({ params, currentUser, set }) => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'lead') {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Tidak memiliki izin hapus project')
    }
    await db.delete(projects).where(eq(projects.id, params.id))
    return success({ message: 'Project berhasil dihapus' })
  })
  .get('/:id/members', async ({ params, currentUser, set }) => {
    const isMember = await isProjectMember(params.id, currentUser.id, currentUser.role)
    if (!isMember) {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Bukan anggota project ini')
    }

    const members = await db
      .select({
        userId: projectMembers.userId,
        role: projectMembers.role,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        addedAt: projectMembers.addedAt,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, params.id))

    return success(members)
  })
  .post(
    '/:id/members',
    async ({ params, currentUser, body, set }) => {
      if (currentUser.role === 'tester' || currentUser.role === 'viewer') {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Tidak memiliki izin kelola anggota')
      }

      await db
        .insert(projectMembers)
        .values({ projectId: params.id, userId: body.userId, role: body.role })
        .onConflictDoUpdate({
          target: [projectMembers.projectId, projectMembers.userId],
          set: { role: body.role },
        })

      return success({ message: 'Anggota berhasil ditambahkan' })
    },
    {
      body: t.Object({
        userId: t.String(),
        role: t.Union([t.Literal('lead'), t.Literal('tester'), t.Literal('viewer')]),
      }),
    }
  )
  .delete(
    '/:id/members/:userId',
    async ({ params, currentUser, set }) => {
      if (currentUser.role === 'tester' || currentUser.role === 'viewer') {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Tidak memiliki izin kelola anggota')
      }

      await db
        .delete(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, params.id),
            eq(projectMembers.userId, params.userId)
          )
        )

      return success({ message: 'Anggota berhasil dihapus' })
    }
  )
