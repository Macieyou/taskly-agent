import { afterEach, expect, it, vi } from 'vitest'
import { todoFixture } from '../../../test/todoFixture'
import { formatDate, isOverdue, selectTodos, validateTodo } from './todos'

afterEach(() => vi.useRealTimers())
it.each(['2026-02-30', '2026-13-01', 'not-a-date', '2026-1-01'])(
  'rejects invalid calendar input %s',
  (due_date) => {
    expect(validateTodo({ ...todoFixture, due_date })).toHaveProperty(
      'due_date',
    )
  },
)
it.each(['2024-02-29', '2026-12-31', null])(
  'accepts valid calendar input %s',
  (due_date) => {
    expect(validateTodo({ ...todoFixture, due_date })).toEqual({})
  },
)
it('validates trimmed length boundaries', () => {
  expect(
    validateTodo({
      ...todoFixture,
      title: 'x'.repeat(120),
      description: 'x'.repeat(2000),
    }),
  ).toEqual({})
  expect(
    validateTodo({
      ...todoFixture,
      title: 'x'.repeat(121),
      description: 'x'.repeat(2001),
    }),
  ).toEqual({ title: expect.any(String), description: expect.any(String) })
})
it('sorts by priority and breaks ties without mutating input', () => {
  const todos = [
    { ...todoFixture, id: 1, priority: 'low' as const },
    { ...todoFixture, id: 2, priority: 'high' as const },
    { ...todoFixture, id: 3, priority: 'high' as const },
  ]
  const original = structuredClone(todos)
  expect(
    selectTodos(todos, 'all', '', 'priority').map((todo) => todo.id),
  ).toEqual([3, 2, 1])
  expect(todos).toEqual(original)
})
it('sorts missing due dates last and applies deterministic ties', () => {
  const todos = [
    { ...todoFixture, id: 1 },
    { ...todoFixture, id: 2, due_date: '2026-10-20' },
    { ...todoFixture, id: 3, due_date: '2026-10-20' },
  ]
  expect(selectTodos(todos, 'all', '', 'due').map((todo) => todo.id)).toEqual([
    3, 2, 1,
  ])
})
it('searches descriptions and excludes completed tasks from active results', () => {
  expect(
    selectTodos(
      [{ ...todoFixture, description: 'Important meeting' }],
      'active',
      ' MEETING ',
      'newest',
    ),
  ).toHaveLength(1)
  expect(
    selectTodos([{ ...todoFixture, completed: true }], 'active', '', 'newest'),
  ).toEqual([])
})
it('marks only unfinished tasks due before the local calendar day overdue', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 23, 12))
  expect(isOverdue({ ...todoFixture, due_date: '2026-10-22' })).toBe(true)
  expect(isOverdue({ ...todoFixture, due_date: '2026-10-23' })).toBe(false)
  expect(
    isOverdue({ ...todoFixture, due_date: '2026-10-22', completed: true }),
  ).toBe(false)
  expect(isOverdue(todoFixture)).toBe(false)
})
it('formats calendar dates consistently', () => {
  expect(formatDate('2026-10-23')).toBe('23 Oct 2026')
})
