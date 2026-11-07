import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { staticPlugin } from '@elysiajs/static'

import { errorHandler } from './plugins/error-handler'
import { logger } from './plugins/logger'
import { authRoutes } from './modules/auth/routes'
import { userRoutes } from './modules/users/routes'
import { projectRoutes } from './modules/projects/routes'
import { sectionRoutes, projectSectionRoutes } from './modules/sections/routes'
import { caseRoutes, projectCaseRoutes } from './modules/cases/routes'
import { runRoutes, projectRunRoutes, testResultRoutes } from './modules/runs/routes'
import { milestoneRoutes, projectMilestoneRoutes } from './modules/milestones/routes'
import { reportsRoutes, projectReportRoutes } from './modules/reports/routes'
import { statusesRoutes } from './modules/statuses/routes'
import { apiKeyRoutes } from './modules/api-keys/routes'
import { moduleRoutes, projectModuleRoutes } from './modules/modules/routes'
import { actorRoutes } from './modules/actors/routes'

const PORT = parseInt(process.env.PORT ?? '3001', 10)

const app = new Elysia()
  .use(
    cors({
      origin: process.env.NODE_ENV === 'production' ? false : true,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  )
  .use(
    swagger({
      path: '/swagger',
      documentation: {
        info: {
          title: 'QAC Tester API',
          version: '1.0.0',
          description: 'API untuk QAC Tester — Test Case Management System',
        },
        tags: [
          { name: 'Auth', description: 'Autentikasi & profil user' },
          { name: 'Users', description: 'Manajemen user' },
          { name: 'Projects', description: 'Manajemen project' },
          { name: 'Reports', description: 'Dashboard & laporan' },
          { name: 'Statuses', description: 'Status konfigurasi' },
        ],
      },
    })
  )
  .use(
    staticPlugin({
      assets: process.env.STORAGE_PATH ?? './storage',
      prefix: '/storage',
    })
  )
  .use(errorHandler)
  .use(logger)
  .get('/', () => ({ message: 'QAC Tester API v1.0.0', docs: '/swagger' }))
  .use(authRoutes)
  .group('/api/v1', (app) =>
    app
      .use(userRoutes)
      .use(projectRoutes)
      .use(reportsRoutes)
      .use(projectReportRoutes)
      .use(statusesRoutes)
      .use(sectionRoutes)
      .use(projectSectionRoutes)
      .use(caseRoutes)
      .use(projectCaseRoutes)
      .use(runRoutes)
      .use(projectRunRoutes)
      .use(testResultRoutes)
      .use(milestoneRoutes)
      .use(projectMilestoneRoutes)
      .use(apiKeyRoutes)
      .use(moduleRoutes)
      .use(projectModuleRoutes)
      .use(actorRoutes)
  )
  .listen(PORT)

console.log(`🚀 QAC Tester API running at http://localhost:${PORT}`)
console.log(`📖 Swagger docs at http://localhost:${PORT}/swagger`)

export type App = typeof app
