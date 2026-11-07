import { Elysia, t } from 'elysia'
import { db } from '../../db'
import { apiKeys, users } from '../../db/schema'
import { authGuard } from '../../plugins/auth-guard'
import { success, errorResponse } from '../../lib/response'
import { eq, desc } from 'drizzle-orm'
import { randomBytes, createHash } from 'node:crypto'

export const apiKeyRoutes = new Elysia({ prefix: '/api-keys' })
  .use(authGuard)
  .get('/', async ({ currentUser }) => {
    let rows
    if (currentUser.role === 'admin') {
      rows = await db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          userId: apiKeys.userId,
          userName: users.name,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .innerJoin(users, eq(apiKeys.userId, users.id))
        .orderBy(desc(apiKeys.createdAt))
    } else {
      rows = await db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          userId: apiKeys.userId,
          userName: users.name,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .innerJoin(users, eq(apiKeys.userId, users.id))
        .where(eq(apiKeys.userId, currentUser.id))
        .orderBy(desc(apiKeys.createdAt))
    }
    return success(rows)
  })
  .post(
    '/',
    async ({ currentUser, body, set }) => {
      const rawKey = `qac_${randomBytes(24).toString('hex')}`
      const hashedKey = createHash('sha256').update(rawKey).digest('hex')

      const [created] = await db
        .insert(apiKeys)
        .values({
          name: body.name,
          userId: currentUser.id,
          hashedKey,
        })
        .returning()

      set.status = 201
      return success({
        id: created.id,
        name: created.name,
        key: rawKey,
        createdAt: created.createdAt,
      })
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
      }),
    }
  )
  .delete('/:id', async ({ params, currentUser, set }) => {
    const [existing] = await db.select().from(apiKeys).where(eq(apiKeys.id, params.id)).limit(1)
    if (!existing) {
      set.status = 404
      return errorResponse('NOT_FOUND', 'API Key tidak ditemukan')
    }

    if (currentUser.role !== 'admin' && existing.userId !== currentUser.id) {
      set.status = 403
      return errorResponse('FORBIDDEN', 'Tidak memiliki akses untuk menghapus API key ini')
    }

    await db.delete(apiKeys).where(eq(apiKeys.id, params.id))
    return success({ message: 'API Key berhasil dicabut' })
  })
