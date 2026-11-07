import { Elysia, t } from 'elysia'
import { authGuard } from '../../plugins/auth-guard'
import { createRunBody, addResultBody, bulkAddResultBody } from './schema'
import {
  getProjectRuns,
  getRunDetail,
  createRun,
  addTestResult,
  closeRun,
  rerunFailed,
  getRunIssues,
  updateIssue,
} from './service'
import { isProjectMember } from '../projects/service'
import { success, errorResponse } from '../../lib/response'
import { logActivity } from '../../lib/activity'

export const runRoutes = new Elysia({ prefix: '/runs' })
  .use(authGuard)
  .get('/:id', async ({ params, set }) => {
    const detail = await getRunDetail(params.id)
    if (!detail) {
      set.status = 404
      return errorResponse('NOT_FOUND', 'Test run tidak ditemukan')
    }
    return success(detail)
  })
  .post('/:id/close', async ({ params, currentUser, set }) => {
    if (currentUser.role === 'viewer') {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Tidak memiliki izin menutup test run')
    }
    const updated = await closeRun(params.id)
    if (!updated) {
      set.status = 404
      return errorResponse('NOT_FOUND', 'Test run tidak ditemukan')
    }
    await logActivity({
      userId: currentUser.id,
      action: 'close',
      entity: 'run',
      entityId: params.id,
    })
    return success(updated)
  })
  .post('/:id/rerun', async ({ params, currentUser, set }) => {
    if (currentUser.role === 'viewer') {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Tidak memiliki izin membuat test run')
    }
    const newRun = await rerunFailed(params.id, currentUser.id)
    if (!newRun) {
      set.status = 404
      return errorResponse('NOT_FOUND', 'Test run tidak ditemukan atau tidak ada case yang gagal')
    }
    return success(newRun)
  })
  .get('/:id/issues', async ({ params }) => {
    const data = await getRunIssues(params.id)
    return success(data)
  })
  .patch('/issues/:issueId', async ({ params, body, set }) => {
    const updated = await updateIssue(params.issueId, body as any)
    if (!updated) {
      set.status = 404
      return errorResponse('NOT_FOUND', 'Issue tidak ditemukan')
    }
    return success(updated)
  })

export const projectRunRoutes = new Elysia({ prefix: '/projects/:id/runs' })
  .use(authGuard)
  .get('/', async ({ params, currentUser, set }) => {
    const isMember = await isProjectMember(params.id, currentUser.id, currentUser.role)
    if (!isMember) {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Bukan anggota project ini')
    }
    const data = await getProjectRuns(params.id)
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
        return errorResponse('FORBIDDEN', 'Tidak memiliki izin membuat test run')
      }

      const newRun = await createRun(params.id, currentUser.id, body)
      await logActivity({
        projectId: params.id,
        userId: currentUser.id,
        action: 'create',
        entity: 'run',
        entityId: newRun.id,
        meta: { name: newRun.name },
      })
      set.status = 201
      return success(newRun)
    },
    { body: createRunBody }
  )

export const testResultRoutes = new Elysia({ prefix: '/tests/:testId/results' })
  .use(authGuard)
  .post(
    '/',
    async ({ params, currentUser, body, set }) => {
      if (currentUser.role === 'viewer') {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Tidak memiliki izin eksekusi test')
      }

      const res = await addTestResult(params.testId, currentUser.id, body)
      set.status = 201
      return success(res)
    },
    { body: addResultBody }
  )
