import { Elysia, t } from 'elysia'
import { db } from '../../db'
import { actors } from '../../db/schema'
import { authGuard } from '../../plugins/auth-guard'
import { success, errorResponse } from '../../lib/response'
import { eq, or, isNull, asc } from 'drizzle-orm'

export const actorRoutes = new Elysia({ prefix: '/actors' })
  .use(authGuard)
  .get(
    '/',
    async ({ query }) => {
      const { projectId } = query
      let whereClause
      if (projectId) {
        whereClause = or(eq(actors.projectId, projectId), isNull(actors.projectId))
      }
      const rows = await db
        .select()
        .from(actors)
        .where(whereClause)
        .orderBy(asc(actors.name))
      return success(rows)
    },
    {
      query: t.Object({
        projectId: t.Optional(t.String()),
      }),
    }
  )
  .post(
    '/',
    async ({ body, set }) => {
      const [created] = await db
        .insert(actors)
        .values({
          name: body.name.trim(),
          description: body.description?.trim(),
          projectId: body.projectId || null,
        })
        .returning()

      set.status = 201
      return success(created)
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        description: t.Optional(t.String()),
        projectId: t.Optional(t.String()),
      }),
    }
  )
  .delete('/:id', async ({ params, set }) => {
    const [deleted] = await db.delete(actors).where(eq(actors.id, params.id)).returning()
    if (!deleted) {
      set.status = 404
      return errorResponse('NOT_FOUND', 'Aktor tidak ditemukan')
    }
    return success({ message: 'Aktor berhasil dihapus' })
  })
