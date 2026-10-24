import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { TodoForm } from './TodoForm'
import { theme } from '../../../design-system'

it('focuses the first invalid input when validation fails', async () => {
  const user = userEvent.setup()
  render(
    <ThemeProvider theme={theme}>
      <TodoForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        busy={false}
        error={null}
      />
    </ThemeProvider>,
  )
  await user.click(screen.getByRole('button', { name: 'Save task' }))
  await waitFor(() => {
    const title = screen.getByLabelText(/Task title/)
    expect(title).toBeInvalid()
    expect(title).toHaveFocus()
  })
})
