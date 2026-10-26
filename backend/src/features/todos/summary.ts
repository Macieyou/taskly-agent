import type { Todo } from './types.js'

/** A zero-task list has 0% completion; percentages are rounded to whole numbers. */
export function summarizeTodos(todos: readonly Todo[]) {
  const completed = todos.reduce(
    (count, todo) => count + Number(todo.completed),
    0,
  )
  return {
    total: todos.length,
    active: todos.length - completed,
    completed,
    completionPercent:
      todos.length === 0 ? 0 : Math.round((completed / todos.length) * 100),
  }
}
