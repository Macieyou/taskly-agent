import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { todoFixture } from '../../../test/todoFixture'
import { todoKeys } from '../api/queryKeys'
import { useCreateTodoMutation } from './useCreateTodoMutation'
import { useUpdateTodoMutation } from './useUpdateTodoMutation'
import { useDeleteTodoMutation } from './useDeleteTodoMutation'
import { useTodosQuery } from './useTodosQuery'
import { useTodosBusy } from './useTodosBusy'
import type { Todo } from '../types'

const server = setupServer()
const clients: QueryClient[] = []
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clients.splice(0).forEach((client) => client.clear())
})
afterAll(() => server.close())
function setup(initial?: Todo[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  clients.push(client)
  if (initial) client.setQueryData(todoKeys.list, initial)
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}
it('loads todos through the real API client', async () => {
  server.use(http.get('*/api/todos', () => HttpResponse.json([todoFixture])))
  const { wrapper } = setup()
  const { result } = renderHook(useTodosQuery, { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toEqual([todoFixture])
})
it('exposes query failures without retry loops', async () => {
  server.use(
    http.get('*/api/todos', () =>
      HttpResponse.json({ detail: 'Unavailable' }, { status: 503 }),
    ),
  )
  const { wrapper } = setup()
  const { result } = renderHook(useTodosQuery, { wrapper })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.error?.message).toBe('Unavailable')
})
it.each([false, true])(
  'creates a task and deduplicates confirmed cache entries (existing=%s)',
  async (existing) => {
    const saved = { ...todoFixture, title: 'Saved task' }
    server.use(
      http.post('*/api/todos', () => HttpResponse.json(saved, { status: 201 })),
    )
    const { wrapper, client } = setup(
      existing ? [todoFixture, { ...todoFixture, id: 9 }] : undefined,
    )
    const { result } = renderHook(useCreateTodoMutation, { wrapper })
    await act(async () => {
      await result.current.mutateAsync(todoFixture)
    })
    expect(client.getQueryData(todoKeys.list)).toEqual(
      existing ? [saved, { ...todoFixture, id: 9 }] : [saved],
    )
  },
)
it('updates the matching cached task without changing neighbors', async () => {
  const saved = { ...todoFixture, completed: true }
  server.use(http.patch('*/api/todos/7', () => HttpResponse.json(saved)))
  const neighbor = { ...todoFixture, id: 8 }
  const { wrapper, client } = setup([todoFixture, neighbor])
  const { result } = renderHook(useUpdateTodoMutation, { wrapper })
  await act(async () => {
    await result.current.mutateAsync({ id: 7, input: { completed: true } })
  })
  expect(client.getQueryData(todoKeys.list)).toEqual([saved, neighbor])
})
it('preserves cached tasks when a mutation fails', async () => {
  server.use(
    http.patch('*/api/todos/7', () =>
      HttpResponse.json({ detail: 'Cannot save' }, { status: 500 }),
    ),
  )
  const { wrapper, client } = setup([todoFixture])
  const { result } = renderHook(useUpdateTodoMutation, { wrapper })
  await act(async () => {
    await expect(
      result.current.mutateAsync({ id: 7, input: { completed: true } }),
    ).rejects.toThrow('Cannot save')
  })
  expect(client.getQueryData(todoKeys.list)).toEqual([todoFixture])
})
it.each([false, true])(
  'deletes only the selected cached task (existing=%s)',
  async (existing) => {
    server.use(
      http.delete(
        '*/api/todos/7',
        () => new HttpResponse(null, { status: 204 }),
      ),
    )
    const neighbor = { ...todoFixture, id: 8 }
    const { wrapper, client } = setup(
      existing ? [todoFixture, neighbor] : undefined,
    )
    const { result } = renderHook(useDeleteTodoMutation, { wrapper })
    await act(async () => {
      await result.current.mutateAsync(7)
    })
    expect(client.getQueryData(todoKeys.list)).toEqual(
      existing ? [neighbor] : undefined,
    )
  },
)
it('exposes busy state while a request is pending and clears it on completion', async () => {
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http.post('*/api/todos', async () => {
      await pending
      return HttpResponse.json(todoFixture)
    }),
  )
  const { wrapper } = setup()
  const { result } = renderHook(
    () => ({ mutation: useCreateTodoMutation(), busy: useTodosBusy() }),
    { wrapper },
  )
  act(() => result.current.mutation.mutate(todoFixture))
  await waitFor(() => expect(result.current.busy).toBe(true))
  release()
  await waitFor(() => expect(result.current.busy).toBe(false))
  expect(result.current.mutation.isSuccess).toBe(true)
})
