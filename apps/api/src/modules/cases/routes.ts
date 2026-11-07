import { Elysia, t } from 'elysia'
import { authGuard } from '../../plugins/auth-guard'
import { createCaseBody, updateCaseBody, filterCasesQuery } from './schema'
import {
  getCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
} from './service'
import { isProjectMember } from '../projects/service'
import { success, errorResponse } from '../../lib/response'
import { logActivity } from '../../lib/activity'

export const caseRoutes = new Elysia({ prefix: '/cases' })
  .use(authGuard)
  .get('/:id', async ({ params, set }) => {
    const item = await getCaseById(params.id)
    if (!item) {
      set.status = 404
      return errorResponse('NOT_FOUND', 'Test case tidak ditemukan')
    }
    return success(item)
  })
  .patch(
    '/:id',
    async ({ params, currentUser, body, set }) => {
      if (currentUser.role === 'viewer') {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Tidak memiliki izin edit test case')
      }

      try {
        const updated = await updateCase(params.id, currentUser.id, body)
        if (!updated) {
          set.status = 404
          return errorResponse('NOT_FOUND', 'Test case tidak ditemukan')
        }

        await logActivity({
          userId: currentUser.id,
          action: 'update',
          entity: 'case',
          entityId: updated.id,
          meta: { title: updated.title, code: updated.code },
        })

        return success(updated)
      } catch (err: any) {
        if (err?.code === 'CASE_LOCKED') {
          set.status = 400
          return errorResponse('CASE_LOCKED', err.message)
        }
        throw err
      }
    },
    { body: updateCaseBody }
  )
  .delete('/:id', async ({ params, currentUser, set }) => {
    if (currentUser.role === 'viewer') {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Tidak memiliki izin hapus test case')
    }

    const ok = await deleteCase(params.id, currentUser.id)
    if (!ok) {
      set.status = 404
      return errorResponse('NOT_FOUND', 'Test case tidak ditemukan')
    }

    await logActivity({
      userId: currentUser.id,
      action: 'delete',
      entity: 'case',
      entityId: params.id,
    })

    return success({ message: 'Test case berhasil dihapus' })
  })

export const projectCaseRoutes = new Elysia({ prefix: '/projects/:id/cases' })
  .use(authGuard)
  .get(
    '/',
    async ({ params, query, currentUser, set }) => {
      const isMember = await isProjectMember(params.id, currentUser.id, currentUser.role)
      if (!isMember) {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Bukan anggota project ini')
      }

      const result = await getCases(params.id, query)
      return success(result.cases, result.meta)
    },
    { query: filterCasesQuery }
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
        return errorResponse('FORBIDDEN', 'Tidak memiliki izin buat test case')
      }

      const newCase = await createCase(currentUser.id, params.id, body)

      await logActivity({
        projectId: params.id,
        userId: currentUser.id,
        action: 'create',
        entity: 'case',
        entityId: newCase.id,
        meta: { title: newCase.title, code: newCase.code },
      })

      set.status = 201
      return success(newCase)
    },
    { body: createCaseBody }
  )
