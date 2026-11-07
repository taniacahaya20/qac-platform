import { Elysia, t } from 'elysia'
import { db } from '../../db'
import { users } from '../../db/schema'
import { eq, ilike, sql } from 'drizzle-orm'
import { authGuard } from '../../plugins/auth-guard'
import { success, errorResponse } from '../../lib/response'

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(authGuard)
  .get(
    '/',
    async ({ query }) => {
      const { page = 1, limit = 50, search } = query
      const offset = (Number(page) - 1) * Number(limit)
      const where = search ? ilike(users.name, `%${search}%`) : undefined
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(where)
        .limit(Number(limit))
        .offset(offset)
        .orderBy(users.name)
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(where)
      return success(rows, {
        page: Number(page),
        limit: Number(limit),
        total: Number(count),
        totalPages: Math.ceil(Number(count) / Number(limit)),
      })
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric()),
        limit: t.Optional(t.Numeric()),
        search: t.Optional(t.String()),
      }),
    }
  )
  .get('/:id', async ({ params, set }) => {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1)
    if (!user) {
      set.status = 404
      return errorResponse('NOT_FOUND', 'User tidak ditemukan')
    }
    return success(user)
  })
  .post(
    '/',
    async ({ currentUser, body, set }) => {
      if (currentUser.role !== 'admin') {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Hanya admin yang dapat menambah user')
      }

      const [existing] = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
      if (existing) {
        set.status = 409
        return errorResponse('CONFLICT', 'Email sudah terdaftar')
      }

      const passwordHash = await Bun.password.hash(body.password, { algorithm: 'bcrypt', cost: 10 })
      const [newUser] = await db
        .insert(users)
        .values({
          name: body.name,
          email: body.email,
          passwordHash,
          role: body.role as any,
          isActive: true,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })

      set.status = 201
      return success(newUser)
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 6 }),
        role: t.Union([t.Literal('admin'), t.Literal('lead'), t.Literal('tester'), t.Literal('viewer')]),
      }),
    }
  )
  .patch(
    '/:id',
    async ({ params, currentUser, body, set }) => {
      if (currentUser.role !== 'admin') {
        set.status = 403
        return errorResponse('FORBIDDEN', 'Hanya admin yang dapat mengedit user')
      }

      const updateData: any = {}
      if (body.name !== undefined) updateData.name = body.name
      if (body.role !== undefined) updateData.role = body.role
      if (body.isActive !== undefined) updateData.isActive = body.isActive

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, params.id))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
        })

      if (!updated) {
        set.status = 404
        return errorResponse('NOT_FOUND', 'User tidak ditemukan')
      }

      return success(updated)
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        role: t.Optional(t.Union([t.Literal('admin'), t.Literal('lead'), t.Literal('tester'), t.Literal('viewer')])),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
