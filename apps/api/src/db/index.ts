import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { PGlite } from '@electric-sql/pglite'
import postgres from 'postgres'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'

const usePglite =
  process.env.DB_DRIVER === 'pglite' ||
  (!process.env.USE_POSTGRES_DOCKER && !process.env.DATABASE_URL) ||
  process.env.USE_PGLITE === 'true'

let dbInstance: ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>

if (usePglite) {
  const dataDir = path.resolve(process.cwd(), 'data/pgdata')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  const client = new PGlite(dataDir)
  dbInstance = drizzlePglite(client, { schema })
} else {
  const connectionString =
    process.env.DATABASE_URL ?? 'postgresql://qac:qac_pass@localhost:5432/qac_tester'
  const client = postgres(connectionString, { max: 20 })
  dbInstance = drizzlePg(client, { schema })
}

export const db = dbInstance
export type Db = typeof db
