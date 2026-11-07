import { db } from '../../db'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { errorResponse } from '../../lib/response'

export async function loginUser(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user) return { error: errorResponse('INVALID_CREDENTIALS', 'Email atau password salah') }
  if (!user.isActive) return { error: errorResponse('ACCOUNT_INACTIVE', 'Akun tidak aktif') }
  const valid = await Bun.password.verify(password, user.passwordHash)
  if (!valid) return { error: errorResponse('INVALID_CREDENTIALS', 'Email atau password salah') }
  return { user }
}

export function sanitizeUser(user: typeof users.$inferSelect) {
  const { passwordHash: _, ...safe } = user
  return safe
}
