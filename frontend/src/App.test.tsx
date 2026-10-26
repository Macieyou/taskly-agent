import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderWithProviders } from './test/renderWithProviders'
import App from './App'

const server = setupServer(http.get('*/api/todos', () => HttpResponse.json([])))
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

it('provides navigation and opens task creation from the empty page', async () => {
  const user = userEvent.setup()
  renderWithProviders(<App />)
  expect(
    within(screen.getByRole('banner')).getByRole('link', {
      name: 'Taskly App Node — home',
    }),
  ).toHaveAttribute('href', '/')
  const main = screen.getByRole('main')
  expect(within(main).getByRole('heading', { name: 'Tasks' })).toBeVisible()
  await user.click(
    await within(main).findByRole('button', { name: 'Add your first task' }),
  )
  expect(screen.getByRole('dialog', { name: 'New task' })).toBeVisible()
})
