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
    headers: new Headers({
      'Content-Type': 'application/json',
      'X-Request': 'test',
    }),
  })
})

const headerInputs: { headers: HeadersInit; value: string }[] = [
  {
    headers: new Headers({
      'X-Request': 'headers-object',
      'content-type': 'application/problem+json',
    }),
    value: 'headers-object',
  },
  { headers: [['X-Request', 'tuple']], value: 'tuple' },
]

it.each(headerInputs)(
  'preserves supported header input forms ($value)',
  async ({ headers, value }) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetch)
    await request('/todos', { headers })
    const options = fetch.mock.calls[0]?.[1]
    const sent = new Headers(options?.headers)
    expect(sent.get('X-Request')).toBe(value)
    expect(sent.get('Content-Type')).toBe(
      value === 'headers-object'
        ? 'application/problem+json'
        : 'application/json',
    )
  },
)

it('turns malformed successful JSON into an actionable error with its cause', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('<html>Proxy error</html>')),
  )
  const result = request('/todos')
  await expect(result).rejects.toThrow(
    'The server returned an invalid response.',
  )
  await expect(result).rejects.toHaveProperty('cause', expect.any(SyntaxError))
})

it('preserves cancellation while the response body is being read', async () => {
  const controller = new AbortController()
  const failure = new DOMException('Aborted while reading', 'AbortError')
  const response = new Response('{}')
  vi.spyOn(response, 'json').mockImplementation(() => {
    controller.abort()
    return Promise.reject(failure)
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
  await expect(request('/todos', { signal: controller.signal })).rejects.toBe(
    failure,
  )
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
  const failure = new TypeError('Failed to fetch')
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure))
  const result = request('/todos')
  await expect(result).rejects.toThrow('Cannot connect to the server.')
  await expect(result).rejects.toHaveProperty('cause', failure)
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
