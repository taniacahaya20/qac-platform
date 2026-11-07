import { Elysia } from 'elysia'
import { db } from '../db'
import { apiKeys, users } from '../db/schema'
import { eq } from 'drizzle-orm'

async function hashKey(key: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const apiKeyGuard = new Elysia({ name: 'api-key-guard' })
  .derive({ as: 'scoped' }, async ({ headers, set }) => {
    const rawKey = headers['x-api-key']
    if (!rawKey) {
      set.status = 401
      throw new Error('API key diperlukan (header X-API-Key)')
    }

    const hashed = await hashKey(rawKey)
    const [keyRecord] = await db
      .select({ id: apiKeys.id, userId: apiKeys.userId, expiresAt: apiKeys.expiresAt })
      .from(apiKeys)
      .where(eq(apiKeys.hashedKey, hashed))
      .limit(1)

    if (!keyRecord) {
      set.status = 401
      throw new Error('API key tidak valid')
    }

    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      set.status = 401
      throw new Error('API key sudah expired')
    }

    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, keyRecord.id))

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, keyRecord.userId))
      .limit(1)
    if (!user || !user.isActive) {
      set.status = 401
      throw new Error('User pemilik API key tidak aktif')
    }

    return { apiKeyUser: user }
  })
