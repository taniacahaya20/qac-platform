import { Elysia, t } from 'elysia'
import { authGuard } from '../../plugins/auth-guard'
import { createSectionBody, updateSectionBody } from './schema'
import {
  getProjectSections,
  getDefaultSuiteForProject,
  createSection,
  updateSection,
  deleteSection,
} from './service'
import { isProjectMember } from '../projects/service'
import { success, errorResponse } from '../../lib/response'
import { logActivity } from '../../lib/activity'

export const sectionRoutes = new Elysia({ prefix: '/sections' })
  .use(authGuard)
  .patch(
    '/:id',
    async ({ params, currentUser, body, set }) => {
      const updated = await updateSection(params.id, body)
      if (!updated) {
        set.status = 404
        return errorResponse('NOT_FOUND', 'Section tidak ditemukan')
      }
      return success(updated)
    },
    { body: updateSectionBody }
  )
  .delete('/:id', async ({ params, currentUser, set }) => {
    if (currentUser.role === 'viewer') {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Tidak memiliki izin hapus section')
    }
    await deleteSection(params.id)
    return success({ message: 'Section berhasil dihapus' })
  })

export const projectSectionRoutes = new Elysia({ prefix: '/projects/:id/sections' })
  .use(authGuard)
  .get(
    '/',
    async ({ params, query, currentUser, set }) => {
      const isMember = await isProjectMember(params.id, currentUser.id, currentUser.role)
      if (!isMember) {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Bukan anggota project ini')
      }

      const tree = await getProjectSections(params.id, query.suiteId)
      return success(tree)
    },
    {
      query: t.Object({
        suiteId: t.Optional(t.String()),
      }),
    }
  )
  .post(
    '/',
    async ({ params, currentUser, body, set }) => {
      const isMember = await isProjectMember(params.id, currentUser.id, currentUser.role)
      if (!isMember) {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Bukan anggota project ini')
      }

      if (currentUser.role === 'viewer') {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Tidak memiliki izin tambah section')
      }

      const suite = body.suiteId
        ? { id: body.suiteId }
        : await getDefaultSuiteForProject(params.id)

      const section = await createSection({
        suiteId: suite.id,
        parentId: body.parentId,
        name: body.name,
        description: body.description,
      })

      await logActivity({
        projectId: params.id,
        userId: currentUser.id,
        action: 'create',
        entity: 'section',
        entityId: section.id,
        meta: { name: section.name },
      })

      set.status = 201
      return success(section)
    },
    { body: createSectionBody }
  )
