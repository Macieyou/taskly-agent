import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

dotenv.config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true,
})

function requiredEnvironment(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export function resolveDatabaseUrl(override?: string): string {
  const explicit = override || process.env.DATABASE_URL
  if (explicit) return explicit.replace(/^postgresql\+psycopg:/, 'postgresql:')
  const username = requiredEnvironment('POSTGRES_USER')
  const password = requiredEnvironment('POSTGRES_PASSWORD')
  const hostname = requiredEnvironment('POSTGRES_HOST')
  const port = requiredEnvironment('DB_PORT')
  const database = requiredEnvironment('POSTGRES_DB')
  const url = new URL('postgresql://localhost')
  url.username = username
  url.password = password
  url.hostname = hostname
  url.port = port
  url.pathname = `/${encodeURIComponent(database)}`
  return url.toString()
}
