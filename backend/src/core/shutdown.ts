import type { Server } from 'node:http'

/** Drain active requests before disconnecting persistence, once across all signals. */
export function createShutdownHandler(
  server: Server,
  disconnect: () => Promise<void>,
): () => void {
  let started = false
  return () => {
    if (started) return
    started = true
    const timeout = setTimeout(() => process.exit(1), 10_000)
    timeout.unref()
    server.close((error) => {
      if (error) {
        console.error(error)
        process.exitCode = 1
      }
      void Promise.resolve()
        .then(disconnect)
        .catch((error: unknown) => {
          console.error(error)
          process.exitCode = 1
        })
        .finally(() => clearTimeout(timeout))
    })
  }
}
