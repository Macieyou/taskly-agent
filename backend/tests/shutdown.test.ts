import { createServer, type Server, type ServerResponse } from 'node:http'
import { afterEach, expect, it, vi } from 'vitest'
import { createShutdownHandler } from '../src/core/shutdown.js'

const servers = new Set<Server>()
const initialExitCode = process.exitCode

afterEach(async () => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  process.exitCode = initialExitCode
  for (const server of servers) {
    server.closeAllConnections()
    if (server.listening)
      await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  servers.clear()
})

async function listen(server: Server): Promise<string> {
  servers.add(server)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Expected a TCP listener')
  return `http://127.0.0.1:${address.port}`
}

it('drains an active request before disconnecting and ignores repeated shutdown signals', async () => {
  let pendingResponse: ServerResponse | undefined
  const server = createServer((req, res) => {
    pendingResponse = res
  })
  const url = await listen(server)
  const responsePromise = fetch(url, { headers: { Connection: 'close' } })
  await vi.waitFor(() => expect(pendingResponse).toBeDefined())
  const disconnect = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const shutdown = createShutdownHandler(server, disconnect)
  shutdown()
  shutdown()
  expect(disconnect).not.toHaveBeenCalled()
  if (!pendingResponse) throw new Error('Expected an active request')
  pendingResponse.end('Finished')
  expect(await (await responsePromise).text()).toBe('Finished')
  await vi.waitFor(() => expect(disconnect).toHaveBeenCalledTimes(1))
  shutdown()
  expect(disconnect).toHaveBeenCalledTimes(1)
  expect(server.listening).toBe(false)
})

it('records a persistence cleanup failure and clears the deadline', async () => {
  const server = createServer()
  await listen(server)
  vi.useFakeTimers()
  const failure = new Error('Disconnect failed')
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const disconnect = vi.fn<() => Promise<void>>().mockRejectedValue(failure)
  createShutdownHandler(server, disconnect)()
  await vi.waitFor(() => expect(log).toHaveBeenCalledWith(failure))
  expect(process.exitCode).toBe(1)
  expect(vi.getTimerCount()).toBe(0)
})

it('reports a close failure but still disconnects persistence once', async () => {
  const server = createServer()
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const disconnect = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const shutdown = createShutdownHandler(server, disconnect)
  shutdown()
  shutdown()
  await vi.waitFor(() => expect(disconnect).toHaveBeenCalledTimes(1))
  expect(log).toHaveBeenCalledWith(expect.any(Error))
  expect(process.exitCode).toBe(1)
})

it('terminates within the deadline when persistence never finishes disconnecting', async () => {
  const server = createServer()
  await listen(server)
  vi.useFakeTimers()
  const termination = new Error('Forced termination')
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw termination
  })
  const disconnect = vi.fn(() => new Promise<void>(() => {}))
  createShutdownHandler(server, disconnect)()
  await vi.waitFor(() => expect(disconnect).toHaveBeenCalledTimes(1))
  expect(() => vi.advanceTimersByTime(10_000)).toThrow(termination)
  expect(exit).toHaveBeenCalledWith(1)
})
