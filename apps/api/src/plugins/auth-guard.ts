import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

export interface JwtPayload {
  sub: string
  email: string
  role: string
}

export const authGuard = new Elysia({ name: 'auth-guard' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET ?? 'fallback_secret_change_in_production_32chars',
      exp: '7d',
    })
  )
  .derive({ as: 'scoped' }, async ({ jwt, cookie: { auth_token }, set }) => {
    const token = typeof auth_token?.value === 'string' ? auth_token.value : undefined
    if (!token) {
      set.status = 401
      throw new Error('Token tidak ditemukan')
    }

    const payload = (await jwt.verify(token)) as JwtPayload | false
    if (!payload) {
      set.status = 401
      throw new Error('Token tidak valid atau sudah expired')
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1)
    if (!user || !user.isActive) {
      set.status = 401
      throw new Error('User tidak aktif atau tidak ditemukan')
    }

    return { currentUser: user }
  })
