import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { todoFixture } from '../../../test/todoFixture'
import { DeleteTodoDialog } from './DeleteTodoDialog'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('allows cancelling without sending a delete request', async () => {
  const remove = vi.fn(() => new HttpResponse(null, { status: 204 }))
  server.use(http.delete('*/api/todos/7', remove))
  const user = userEvent.setup()
  const onClose = vi.fn()
  const onDeleted = vi.fn()
  renderWithProviders(
    <DeleteTodoDialog
      todo={todoFixture}
      busy={false}
      onClose={onClose}
      onDeleted={onDeleted}
    />,
  )
  expect(screen.getByRole('dialog', { name: 'Delete task?' })).toBeVisible()
  expect(
    screen.getByText(
      `The task “${todoFixture.title}” will be permanently deleted.`,
    ),
  ).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalledTimes(1)
  expect(remove).not.toHaveBeenCalled()
  expect(onDeleted).not.toHaveBeenCalled()
})

it('keeps a failed deletion visible and allows cancelling without another request', async () => {
  const remove = vi.fn(() =>
    HttpResponse.json({ detail: 'Could not delete.' }, { status: 503 }),
  )
  server.use(http.delete('*/api/todos/7', remove))
  const user = userEvent.setup()
  const onClose = vi.fn()
  const onDeleted = vi.fn()
  renderWithProviders(
    <DeleteTodoDialog
      todo={todoFixture}
      busy={false}
      onClose={onClose}
      onDeleted={onDeleted}
    />,
  )
  await user.click(screen.getByRole('button', { name: 'Delete task' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not delete.',
  )
  expect(screen.getByRole('dialog', { name: 'Delete task?' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalledTimes(1)
  expect(remove).toHaveBeenCalledTimes(1)
  expect(onDeleted).not.toHaveBeenCalled()
})
