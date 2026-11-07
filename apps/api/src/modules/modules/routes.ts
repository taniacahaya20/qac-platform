import { Elysia } from 'elysia'
import { authGuard } from '../../plugins/auth-guard'
import { createModuleBody, updateModuleBody } from './schema'
import {
  getProjectModules,
  createModule,
  updateModule,
  deleteModule,
  getNextTestCaseId,
} from './service'
import { isProjectMember } from '../projects/service'
import { success, errorResponse } from '../../lib/response'
import { logActivity } from '../../lib/activity'

export const moduleRoutes = new Elysia({ prefix: '/modules' })
  .use(authGuard)
  .patch(
    '/:id',
    async ({ params, currentUser, body, set }) => {
      if (currentUser.role === 'viewer') {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Tidak memiliki izin mengubah modul')
      }
      const updated = await updateModule(params.id, body)
      if (!updated) {
        set.status = 404
        return errorResponse('NOT_FOUND', 'Modul tidak ditemukan')
      }
      return success(updated)
    },
    { body: updateModuleBody }
  )
  .delete('/:id', async ({ params, currentUser, set }) => {
    if (currentUser.role === 'viewer') {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Tidak memiliki izin menghapus modul')
    }
    await deleteModule(params.id)
    return success({ message: 'Modul berhasil dihapus' })
  })

export const projectModuleRoutes = new Elysia({ prefix: '/projects/:id/modules' })
  .use(authGuard)
  .get('/', async ({ params, currentUser, set }) => {
    const isMember = await isProjectMember(params.id, currentUser.id, currentUser.role)
    if (!isMember) {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Bukan anggota project ini')
    }
    const data = await getProjectModules(params.id)
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
        return errorResponse('FORBIDDEN', 'Tidak memiliki izin membuat modul')
      }

      const created = await createModule(params.id, body)
      await logActivity({
        projectId: params.id,
        userId: currentUser.id,
        action: 'create',
        entity: 'module',
        entityId: created.id,
        meta: { name: created.name, code: created.code },
      })
      set.status = 201
      return success(created)
    },
    { body: createModuleBody }
  )
  .get('/:moduleId/next-case-id', async ({ params, currentUser, set }) => {
    const isMember = await isProjectMember(params.id, currentUser.id, currentUser.role)
    if (!isMember) {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Bukan anggota project ini')
    }
    const nextId = await getNextTestCaseId(params.moduleId, params.id)
    return success({ nextId })
  })
