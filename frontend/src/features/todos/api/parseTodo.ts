import type { Todo } from '../types'
import { isCalendarDate, isPriority } from '../utils/todos'

const invalidResponse =
  'The server returned invalid task data. Please try again.'

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function isTodo(value: unknown): value is Todo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    'title' in value &&
    typeof value.title === 'string' &&
    'description' in value &&
    typeof value.description === 'string' &&
    'priority' in value &&
    isPriority(value.priority) &&
    'completed' in value &&
    typeof value.completed === 'boolean' &&
    'due_date' in value &&
    (value.due_date === null ||
      (typeof value.due_date === 'string' && isCalendarDate(value.due_date))) &&
    'created_at' in value &&
    isTimestamp(value.created_at) &&
    'updated_at' in value &&
    isTimestamp(value.updated_at)
  )
}

export function parseTodo(value: unknown): Todo {
  if (!isTodo(value)) throw new Error(invalidResponse)
  return value
}

export function parseTodos(value: unknown): Todo[] {
  if (!Array.isArray(value)) throw new Error(invalidResponse)
  return value.map(parseTodo)
}
