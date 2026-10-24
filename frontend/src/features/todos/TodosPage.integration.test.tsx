import { QueryClient } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '../../app/AppProviders'
import { todoFixture } from '../../test/todoFixture'
import type { Todo, TodoInput } from './types'
import { TodosPage } from './TodosPage'

let todos: Todo[]
const clients: QueryClient[] = []
const server = setupServer(
  http.get('*/api/todos', () => HttpResponse.json(todos)),
  http.post('*/api/todos', async ({ request }) => {
    const input = (await request.json()) as TodoInput
    const saved = { ...todoFixture, ...input, id: 20 }
    todos = [saved, ...todos]
    return HttpResponse.json(saved, { status: 201 })
  }),
  http.patch('*/api/todos/:id', async ({ request, params }) => {
    const input = (await request.json()) as Partial<TodoInput>
    const saved = {
      ...todos.find((todo) => todo.id === Number(params.id))!,
      ...input,
    }
    todos = todos.map((todo) => (todo.id === saved.id ? saved : todo))
    return HttpResponse.json(saved)
  }),
  http.delete('*/api/todos/:id', ({ params }) => {
    todos = todos.filter((todo) => todo.id !== Number(params.id))
    return new HttpResponse(null, { status: 204 })
  }),
)
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false
    },
  })
})
beforeEach(() => {
  todos = [todoFixture]
  // jsdom has no native modal implementation; only polyfill the browser boundary.
})
afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
  clients.splice(0).forEach((client) => client.clear())
})
afterAll(() => {
  server.close()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})
function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  clients.push(client)
  return render(
    <AppProviders client={client}>
      <TodosPage />
    </AppProviders>,
  )
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
