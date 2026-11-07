import { db } from '../db'
import { activityLog } from '../db/schema'

export async function logActivity(params: {
  projectId?: string
  userId: string
  action: string
  entity: string
  entityId: string
  meta?: Record<string, unknown>
}) {
  try {
    await db.insert(activityLog).values({
      projectId: params.projectId,
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      meta: params.meta,
    })
  } catch (err) {
    console.error('Failed to log activity:', err)
  }
}
