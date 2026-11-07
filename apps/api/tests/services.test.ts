import { describe, expect, it } from 'bun:test'
import { loginUser, sanitizeUser } from '../src/modules/auth/service'
import { getProjectsForUser, getProjectById } from '../src/modules/projects/service'
import { db } from '../src/db'
import { users } from '../src/db/schema'
import { eq } from 'drizzle-orm'

describe('Auth Service', () => {
  it('should login successfully with valid admin credentials', async () => {
    const result = await loginUser('admin@qac.local', 'admin123')
    expect(result.error).toBeUndefined()
    expect(result.user).toBeDefined()
    expect(result.user?.email).toBe('admin@qac.local')
    expect(result.user?.role).toBe('admin')
  })

  it('should fail login with wrong password', async () => {
    const result = await loginUser('admin@qac.local', 'wrongpass')
    expect(result.error).toBeDefined()
    expect(result.user).toBeUndefined()
  })

  it('should fail login with non-existent email', async () => {
    const result = await loginUser('nonexistent@qac.local', 'admin123')
    expect(result.error).toBeDefined()
  })

  it('should sanitize user object removing passwordHash', async () => {
    const [user] = await db.select().from(users).where(eq(users.email, 'admin@qac.local')).limit(1)
    const sanitized = sanitizeUser(user)
    expect((sanitized as any).passwordHash).toBeUndefined()
    expect(sanitized.email).toBe('admin@qac.local')
  })
})

describe('Project Service', () => {
  it('admin can list all projects', async () => {
    const [admin] = await db.select().from(users).where(eq(users.email, 'admin@qac.local')).limit(1)
    const projectsList = await getProjectsForUser(admin.id, admin.role)
    expect(projectsList.length).toBeGreaterThan(0)
    expect(projectsList[0].name).toBe('TMS Karlo')
  })

  it('can get project by ID', async () => {
    const [admin] = await db.select().from(users).where(eq(users.email, 'admin@qac.local')).limit(1)
    const projectsList = await getProjectsForUser(admin.id, admin.role)
    const p = await getProjectById(projectsList[0].id)
    expect(p).not.toBeNull()
    expect(p?.name).toBe('TMS Karlo')
  })
})
