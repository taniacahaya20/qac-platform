import { Elysia } from 'elysia'

export const logger = new Elysia({ name: 'logger' })
  .onRequest(({ request }) => {
    console.log(`→ ${request.method} ${new URL(request.url).pathname}`)
  })
  .onAfterHandle(({ request, set }) => {
    const status = typeof set.status === 'number' ? set.status : 200
    console.log(`← ${request.method} ${new URL(request.url).pathname} ${status}`)
  })
