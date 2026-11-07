import { Elysia } from 'elysia'
import { authGuard } from '../../plugins/auth-guard'
import { createMilestoneBody, updateMilestoneBody } from './schema'
import {
  getProjectMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from './service'
import { isProjectMember } from '../projects/service'
import { success, errorResponse } from '../../lib/response'
import { logActivity } from '../../lib/activity'

export const milestoneRoutes = new Elysia({ prefix: '/milestones' })
  .use(authGuard)
  .patch(
    '/:id',
    async ({ params, currentUser, body, set }) => {
      if (currentUser.role === 'viewer') {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Tidak memiliki izin edit milestone')
      }
      const updated = await updateMilestone(params.id, body)
      if (!updated) {
        set.status = 404
        return errorResponse('NOT_FOUND', 'Milestone tidak ditemukan')
      }
      return success(updated)
    },
    { body: updateMilestoneBody }
  )
  .delete('/:id', async ({ params, currentUser, set }) => {
    if (currentUser.role === 'viewer') {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Tidak memiliki izin hapus milestone')
    }
    await deleteMilestone(params.id)
    return success({ message: 'Milestone berhasil dihapus' })
  })

export const projectMilestoneRoutes = new Elysia({ prefix: '/projects/:id/milestones' })
  .use(authGuard)
  .get('/', async ({ params, currentUser, set }) => {
    const isMember = await isProjectMember(params.id, currentUser.id, currentUser.role)
    if (!isMember) {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Bukan anggota project ini')
    }
    const data = await getProjectMilestones(params.id)
    return success(data)
  })
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
        return errorResponse('FORBIDDEN', 'Tidak memiliki izin buat milestone')
      }

      const created = await createMilestone(params.id, body)
      await logActivity({
        projectId: params.id,
        userId: currentUser.id,
        action: 'create',
        entity: 'milestone',
        entityId: created.id,
        meta: { name: created.name },
      })
      set.status = 201
      return success(created)
    },
    { body: createMilestoneBody }
  )
