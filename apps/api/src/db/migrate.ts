import path from 'path'
import fs from 'fs'

const usePglite =
  process.env.DB_DRIVER === 'pglite' ||
  (!process.env.USE_POSTGRES_DOCKER && !process.env.DATABASE_URL) ||
  process.env.USE_PGLITE === 'true'

const migrationsFolder = path.resolve(import.meta.dir, 'migrations')

console.log('Running migrations...')

if (usePglite) {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const { migrate } = await import('drizzle-orm/pglite/migrator')

  const dataDir = path.resolve(process.cwd(), 'data/pgdata')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  const client = new PGlite(dataDir)
  const db = drizzle(client)
  await migrate(db, { migrationsFolder })
} else {
  const postgres = (await import('postgres')).default
  const { drizzle } = await import('drizzle-orm/postgres-js')
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')

  const connectionString =
    process.env.DATABASE_URL ?? 'postgresql://qac:qac_pass@localhost:5432/qac_tester'
  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client)
  await migrate(db, { migrationsFolder })
  await client.end()
}

console.log('Migrations complete!')
