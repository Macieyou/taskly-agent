import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { todoFixture } from '../../../test/todoFixture'
import { useTodoFilters } from './useTodoFilters'

it('combines search and status and recomputes when input changes', () => {
  const completed = {
    ...todoFixture,
    id: 8,
    completed: true,
    title: 'Ship release',
  }
  const { result, rerender } = renderHook(
    ({ todos }) => useTodoFilters(todos),
    { initialProps: { todos: [todoFixture, completed] } },
  )
  expect(result.current.visible).toHaveLength(2)
  act(() => {
    result.current.setFilter('completed')
    result.current.setSearch('SHIP')
    result.current.setSort('priority')
  })
  expect(result.current.visible).toEqual([completed])
  rerender({ todos: [todoFixture] })
  expect(result.current.visible).toEqual([])
})
