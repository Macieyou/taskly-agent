import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderWithProviders } from '../../test/renderWithProviders'
import { todoFixture } from '../../test/todoFixture'
import type { Todo } from './types'
import { parseTodo } from './api/parseTodo'
import { TodosPage } from './TodosPage'

let todos: Todo[]
async function readInput(request: Request): Promise<object> {
  const input: unknown = await request.json()
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    throw new Error('Expected a task object')
  return input
}
const server = setupServer(
  http.get('*/api/todos', () => HttpResponse.json(todos)),
  http.post('*/api/todos', async ({ request }) => {
    const input = await readInput(request)
    const saved = parseTodo({ ...todoFixture, ...input, id: 20 })
    todos = [saved, ...todos]
    return HttpResponse.json(saved, { status: 201 })
  }),
  http.patch('*/api/todos/:id', async ({ request, params }) => {
    const input = await readInput(request)
    const existing = todos.find((todo) => todo.id === Number(params.id))
    if (!existing) return new HttpResponse(null, { status: 404 })
    const saved = parseTodo({ ...existing, ...input })
    todos = todos.map((todo) => (todo.id === saved.id ? saved : todo))
    return HttpResponse.json(saved)
  }),
  http.delete('*/api/todos/:id', ({ params }) => {
    todos = todos.filter((todo) => todo.id !== Number(params.id))
    return new HttpResponse(null, { status: 204 })
  }),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  todos = [todoFixture]
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
function renderPage() {
  return renderWithProviders(<TodosPage />)
}
it('creates, edits, completes and deletes tasks through real components and query hooks', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole('heading', { name: 'Prepare a demo' })
  await user.click(screen.getByRole('button', { name: 'New task' }))
  let dialog = screen.getByRole('dialog')
  await user.type(
    within(dialog).getByRole('textbox', { name: 'Task title *' }),
    'Review agent tests',
  )
  await user.click(within(dialog).getByRole('button', { name: 'Save task' }))
  await screen.findByRole('heading', { name: 'Review agent tests' })
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  await user.click(
    screen.getByRole('button', { name: 'Edit: Review agent tests' }),
  )
  dialog = screen.getByRole('dialog')
  const title = within(dialog).getByRole('textbox', { name: 'Task title *' })
  await user.clear(title)
  await user.type(title, 'Reviewed tests')
  await user.click(within(dialog).getByRole('button', { name: 'Save task' }))
  await screen.findByRole('heading', { name: 'Reviewed tests' })
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  await user.click(
    screen.getByRole('checkbox', { name: 'Complete: Reviewed tests' }),
  )
  await screen.findByRole('checkbox', {
    name: 'Mark as active: Reviewed tests',
  })
  await user.click(
    screen.getByRole('button', { name: 'Delete: Reviewed tests' }),
  )
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Delete task',
    }),
  )
  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: 'Reviewed tests' }),
    ).not.toBeInTheDocument(),
  )
  expect(
    screen.getByRole('heading', { name: 'Prepare a demo' }),
  ).toBeInTheDocument()
})
it('keeps failed deletion open and lets the user retry', async () => {
  server.use(
    http.delete('*/api/todos/7', () =>
      HttpResponse.json({ detail: 'Please retry deletion' }, { status: 503 }),
    ),
  )
  const user = userEvent.setup()
  renderPage()
  await user.click(
    await screen.findByRole('button', { name: 'Delete: Prepare a demo' }),
  )
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Delete task',
    }),
  )
  expect(await screen.findByText('Please retry deletion')).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: 'Prepare a demo' }),
  ).toBeInTheDocument()
  server.resetHandlers()
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Delete task',
    }),
  )
  await screen.findByRole('heading', { name: 'Add your first task' })
})
it('recovers a failed list request with the retry action', async () => {
  server.use(
    http.get('*/api/todos', () =>
      HttpResponse.json({ detail: 'Temporarily offline' }, { status: 503 }),
    ),
  )
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('Temporarily offline')
  server.resetHandlers()
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(
    await screen.findByRole('heading', { name: 'Prepare a demo' }),
  ).toBeInTheDocument()
})
it('shows filtered empty results without offering a misleading first-task action', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole('heading', { name: 'Prepare a demo' })
  await user.type(
    screen.getByRole('textbox', { name: 'Search tasks' }),
    'no match',
  )
  expect(
    screen.getByRole('heading', { name: 'No matching tasks' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Add your first task' }),
  ).not.toBeInTheDocument()
})
