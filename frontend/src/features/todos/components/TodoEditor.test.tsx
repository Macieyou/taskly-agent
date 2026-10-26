import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { todoFixture } from '../../../test/todoFixture'
import type { TodoInput } from '../types'
import { TodoEditor } from './TodoEditor'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('submits writable form fields and reports a successful create', async () => {
  let received: unknown
  server.use(
    http.post('*/api/todos', async ({ request }) => {
      received = await request.json()
      return HttpResponse.json(todoFixture, { status: 201 })
    }),
  )
  const user = userEvent.setup()
  const onSaved = vi.fn()
  const onClose = vi.fn()
  renderWithProviders(
    <TodoEditor todo="new" busy={false} onClose={onClose} onSaved={onSaved} />,
  )
  expect(screen.getByRole('dialog', { name: 'New task' })).toBeVisible()
  await user.type(
    screen.getByRole('textbox', { name: 'Task title *' }),
    todoFixture.title,
  )
  await user.click(screen.getByRole('button', { name: 'Save task' }))
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith('New task added.'))
  expect(onSaved).toHaveBeenCalledTimes(1)
  expect(onClose).not.toHaveBeenCalled()
  const expected: TodoInput = {
    title: todoFixture.title,
    description: '',
    priority: 'medium',
    due_date: null,
    completed: false,
  }
  expect(received).toEqual(expected)
})
