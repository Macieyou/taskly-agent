import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { todoFixture } from '../../test/todoFixture'
import { TodosPage } from './TodosPage'

const server = setupServer(
  http.get('*/api/todos', () => HttpResponse.json([todoFixture])),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('recovers a query failure when the user retries', async () => {
  server.use(
    http.get('*/api/todos', () =>
      HttpResponse.json(
        { detail: 'The server is unavailable.' },
        { status: 503 },
      ),
    ),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'The server is unavailable.',
  )
  server.resetHandlers()
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(
    await screen.findByRole('heading', { name: todoFixture.title }),
  ).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('clears a failed completion error and reloads the server state on retry', async () => {
  server.use(
    http.patch('*/api/todos/7', () =>
      HttpResponse.json(
        { detail: 'Could not complete the task.' },
        { status: 503 },
      ),
    ),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)
  await user.click(
    await screen.findByRole('checkbox', { name: 'Complete: Prepare a demo' }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not complete the task.',
  )

  const reload = vi.fn(() =>
    HttpResponse.json([{ ...todoFixture, completed: true }]),
  )
  server.use(http.get('*/api/todos', reload))
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(
    await screen.findByRole('checkbox', {
      name: 'Mark as active: Prepare a demo',
    }),
  ).toBeChecked()
  expect(reload).toHaveBeenCalledTimes(1)
  await waitFor(() =>
    expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
  )
})
