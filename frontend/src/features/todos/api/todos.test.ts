import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { todoFixture } from '../../../test/todoFixture'
import { todosApi } from './todos'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('returns validated tasks and accepts an empty list', async () => {
  server.use(http.get('*/api/todos', () => HttpResponse.json([todoFixture])))
  await expect(todosApi.list()).resolves.toEqual([todoFixture])
  server.use(http.get('*/api/todos', () => HttpResponse.json([])))
  await expect(todosApi.list()).resolves.toEqual([])
})

it('preserves request cancellation', async () => {
  const controller = new AbortController()
  const failure = new DOMException('Cancelled', 'AbortError')
  controller.abort(failure)
  await expect(todosApi.list(controller.signal)).rejects.toBe(failure)
})

it('sends only writable task fields on creation', async () => {
  let received: unknown
  server.use(
    http.post('*/api/todos', async ({ request }) => {
      received = await request.json()
      return HttpResponse.json(todoFixture, { status: 201 })
    }),
  )
  await expect(todosApi.create(todoFixture)).resolves.toEqual(todoFixture)
  expect(received).toEqual({
    title: todoFixture.title,
    description: '',
    priority: 'medium',
    due_date: null,
    completed: false,
  })
})

it('sends only supplied writable fields on update', async () => {
  let received: unknown
  server.use(
    http.patch('*/api/todos/7', async ({ request }) => {
      received = await request.json()
      return HttpResponse.json({ ...todoFixture, completed: true })
    }),
  )
  await expect(todosApi.update(7, { completed: true })).resolves.toEqual({
    ...todoFixture,
    completed: true,
  })
  expect(received).toEqual({ completed: true })
})

it('accepts the empty deletion response', async () => {
  server.use(
    http.delete('*/api/todos/7', () => new HttpResponse(null, { status: 204 })),
  )
  await expect(todosApi.remove(7)).resolves.toBeUndefined()
})

const invalidPayloads = [
  null,
  {},
  [null],
  [{ ...todoFixture, id: '7' }],
  [{ ...todoFixture, id: 0 }],
  [{ ...todoFixture, id: 1.5 }],
  [{ ...todoFixture, id: Number.MAX_SAFE_INTEGER + 1 }],
  [{ ...todoFixture, title: null }],
  [{ ...todoFixture, description: 123 }],
  [{ ...todoFixture, priority: 'urgent' }],
  [{ ...todoFixture, completed: 'false' }],
  [{ ...todoFixture, due_date: '2026-02-30' }],
  [{ ...todoFixture, due_date: '2026-1-01' }],
  [{ ...todoFixture, due_date: 123 }],
  [{ ...todoFixture, created_at: 'invalid' }],
  [{ ...todoFixture, updated_at: null }],
  [{ id: 7 }],
]

it.each(invalidPayloads.map((payload) => ({ payload })))(
  'rejects malformed successful list payload %# before exposing it to the UI',
  async ({ payload }) => {
    server.use(http.get('*/api/todos', () => HttpResponse.json(payload)))
    await expect(todosApi.list()).rejects.toThrow(
      'The server returned invalid task data.',
    )
  },
)

it('accepts all priorities and a valid leap-day due date', async () => {
  const todos = ['low', 'medium', 'high'].map((priority, index) => ({
    ...todoFixture,
    id: index + 1,
    priority,
    due_date: '2024-02-29',
  }))
  server.use(http.get('*/api/todos', () => HttpResponse.json(todos)))
  await expect(todosApi.list()).resolves.toEqual(todos)
})

it('validates successful create and update payloads as well as lists', async () => {
  server.use(
    http.post('*/api/todos', () =>
      HttpResponse.json({ id: 7 }, { status: 201 }),
    ),
    http.patch('*/api/todos/7', () => new HttpResponse(null, { status: 204 })),
  )
  await expect(todosApi.create(todoFixture)).rejects.toThrow(
    'The server returned invalid task data.',
  )
  await expect(todosApi.update(7, { completed: true })).rejects.toThrow(
    'The server returned invalid task data.',
  )
})
