import { Elysia, t } from 'elysia'
import { db } from '../../db'
import { statuses } from '../../db/schema'
import { authGuard } from '../../plugins/auth-guard'
import { success, errorResponse } from '../../lib/response'
import { asc, eq } from 'drizzle-orm'

export const statusesRoutes = new Elysia({ prefix: '/statuses' })
  .use(authGuard)
  .get('/', async () => {
    const rows = await db.select().from(statuses).orderBy(asc(statuses.sortOrder))
    return success(rows)
  })
  .patch(
    '/:id',
    async ({ params, currentUser, body, set }) => {
      if (currentUser.role !== 'admin') {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Hanya admin yang dapat mengedit status')
      }

      const id = parseInt(params.id, 10)
      const [updated] = await db
        .update(statuses)
        .set({
          label: body.label,
          color: body.color,
        })
        .where(eq(statuses.id, id))
        .returning()

      if (!updated) {
        set.status = 404
        return errorResponse('NOT_FOUND', 'Status tidak ditemukan')
      }

      return success(updated)
    },
    {
      body: t.Object({
        label: t.Optional(t.String()),
        color: t.Optional(t.String()),
      }),
    }
  )
