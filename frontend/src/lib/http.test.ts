import { afterEach, expect, it, vi } from 'vitest'
import { request } from './http'

afterEach(() => vi.unstubAllGlobals())
it('prefixes the API path, preserves options and parses JSON', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ id: 1 })))
  vi.stubGlobal('fetch', fetch)
  await expect(
    request('/todos', { method: 'POST', headers: { 'X-Request': 'test' } }),
  ).resolves.toEqual({ id: 1 })
  expect(fetch).toHaveBeenCalledWith('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request': 'test' },
  })
})
it('accepts an empty 204 response', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
  )
  await expect(
    request('/todos/1', { method: 'DELETE' }),
  ).resolves.toBeUndefined()
})
it.each([
  [422, { detail: 'internal' }, 'Check the task details'],
  [404, { detail: 'Task not found.' }, 'Task not found.'],
  [500, { detail: [] }, 'The operation failed.'],
])('maps HTTP %s into useful errors', async (status, body, message) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  )
  await expect(request('/todos')).rejects.toThrow(message)
})
it('handles an invalid error body', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })),
  )
  await expect(request('/todos')).rejects.toThrow('The operation failed.')
})
it('explains network failures', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
  )
  await expect(request('/todos')).rejects.toThrow(
    'Cannot connect to the server.',
  )
})
it('preserves cancellation errors so callers can distinguish them', async () => {
  const controller = new AbortController()
  controller.abort()
  const aborted = new DOMException('Aborted', 'AbortError')
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(aborted))
  await expect(request('/todos', { signal: controller.signal })).rejects.toBe(
    aborted,
  )
})
