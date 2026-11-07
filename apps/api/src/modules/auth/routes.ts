import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { db } from '../../db'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { loginUser, sanitizeUser } from './service'
import { loginBody, changePasswordBody, updateProfileBody } from './schema'
import { authGuard } from '../../plugins/auth-guard'
import { success, errorResponse } from '../../lib/response'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET ?? 'fallback_secret_change_in_production_32chars',
      exp: '7d',
    })
  )
  .post(
    '/login',
    async ({ body, jwt, cookie: { auth_token }, set }) => {
      const result = await loginUser(body.email, body.password)
      if (result.error) {
        set.status = 401
        return result.error
      }
      const { user } = result
      const token = await jwt.sign({ sub: user.id, email: user.email, role: user.role })
      auth_token.set({
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      return success(sanitizeUser(user))
    },
    { body: loginBody }
  )
  .post('/logout', ({ cookie: { auth_token } }) => {
    auth_token.remove()
    return success({ message: 'Berhasil logout' })
  })
  .use(authGuard)
  .get('/me', ({ currentUser }) => success(sanitizeUser(currentUser)))
  .patch(
    '/profile',
    async ({ currentUser, body }) => {
      const [updated] = await db
        .update(users)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(users.id, currentUser.id))
        .returning()
      return success(sanitizeUser(updated))
    },
    { body: updateProfileBody }
  )
  .post(
    '/change-password',
    async ({ currentUser, body, set }) => {
      const valid = await Bun.password.verify(body.currentPassword, currentUser.passwordHash)
      if (!valid) {
        set.status = 400
        return errorResponse('INVALID_PASSWORD', 'Password saat ini tidak sesuai')
      }
      const newHash = await Bun.password.hash(body.newPassword)
      await db
        .update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, currentUser.id))
      return success({ message: 'Password berhasil diubah' })
    },
    { body: changePasswordBody }
  )
