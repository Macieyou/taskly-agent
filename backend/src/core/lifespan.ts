import type { Server } from 'node:http'
import { createDatabase, initialize } from './database.js'
import { resolveDatabaseUrl } from './config.js'
import { createApp } from '../factory.js'
import { createShutdownHandler } from './shutdown.js'

export async function start() {
  const database = createDatabase(resolveDatabaseUrl())
  try {
    await database.$connect()
    await initialize(database)
    const app = createApp(database)
    const server = await new Promise<Server>((resolve, reject) => {
      const listener = app.listen(
        Number(process.env.API_PORT || 8000),
        '0.0.0.0',
        () => resolve(listener),
      )
      listener.once('error', reject)
    })
    const address = server.address()
    if (address !== null && typeof address !== 'string')
      console.log(`Taskly App Node API listening on port ${address.port}`)
    const shutdown = createShutdownHandler(server, () => database.$disconnect())
    process.once('SIGTERM', shutdown)
    process.once('SIGINT', shutdown)
    return { server, database }
  } catch (error) {
    await database.$disconnect()
    throw error
  }
}
