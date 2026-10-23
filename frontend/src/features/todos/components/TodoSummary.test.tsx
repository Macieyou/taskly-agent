import { render, screen } from '@testing-library/react'
import { it, expect } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { TodoSummary } from './TodoSummary'
import { theme } from '../../../design-system'
import { todoFixture } from '../../../test/todoFixture'

it.each([
  { completed: [], percent: 0 },
  { completed: [false], percent: 0 },
  { completed: [true, false], percent: 50 },
  { completed: [true, true, false], percent: 67 },
  { completed: [true, true], percent: 100 },
])('displays accessible progress for $completed', ({ completed, percent }) => {
  const todos = completed.map((done, id) => ({ ...todoFixture, id: id + 1, completed: done }))
  render(<ThemeProvider theme={theme}><TodoSummary todos={todos} /></ThemeProvider>)
  expect(screen.getByRole('region', { name: 'Task overview' })).toBeInTheDocument()
  expect(screen.getByText(`${percent}% complete`)).toBeInTheDocument()
  const count = completed.filter(Boolean).length
  for (const [label, value] of [['Total tasks', todos.length], ['To do', todos.length - count], ['Completed', count]] as const) {
    expect(screen.getByText(label).nextElementSibling).toHaveTextContent(String(value))
  }
  expect(screen.getByRole('progressbar', { name: 'Task completion' })).toHaveValue(percent)
})
