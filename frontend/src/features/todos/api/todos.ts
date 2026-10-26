import { request } from '../../../lib/http'
import type { TodoInput } from '../types'
import { parseTodo, parseTodos } from './parseTodo'

export const todosApi = {
  list: async (signal?: AbortSignal) =>
    parseTodos(await request('/todos', { signal })),
  create: async (input: TodoInput) => {
    // A form initialized with a Todo must never send read-only fields.
    const { title, description, priority, due_date, completed } = input
    return parseTodo(
      await request('/todos', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          priority,
          due_date,
          completed,
        }),
      }),
    )
  },
  update: async (id: number, input: Partial<TodoInput>) => {
    const { title, description, priority, due_date, completed } = input
    return parseTodo(
      await request(`/todos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title,
          description,
          priority,
          due_date,
          completed,
        }),
      }),
    )
  },
  remove: async (id: number): Promise<void> => {
    await request(`/todos/${id}`, { method: 'DELETE' })
  },
}
