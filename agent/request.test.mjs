import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { requestWithRetry } from './request.mjs'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

test('retries unavailable service with bounded backoff and returns recovered response', async () => {
  let calls = 0
  const delays = []
  globalThis.fetch = async () =>
    new Response('', { status: ++calls < 3 ? 503 : 200 })
  const result = await requestWithRetry(
    'https://example.test',
    {},
    { sleep: async (ms) => delays.push(ms) },
  )
  assert.equal(result.status, 200)
  assert.equal(calls, 3)
  assert.deepEqual(delays, [2000, 4000])
})

test('stops after three unavailable responses and never retries quota, auth or network failures', async () => {
  for (const status of [503, 429, 401, 403, 400]) {
    let calls = 0
    globalThis.fetch = async () => {
      calls += 1
      return new Response('', { status })
    }
    assert.equal(
      (
        await requestWithRetry(
          'https://example.test',
          {},
          { sleep: async () => {} },
        )
      ).status,
      status,
    )
    assert.equal(calls, status === 503 ? 3 : 1)
  }
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    throw new Error('network failure')
  }
  await assert.rejects(
    () => requestWithRetry('https://example.test', {}),
    /network failure/,
  )
  assert.equal(calls, 1)
})
