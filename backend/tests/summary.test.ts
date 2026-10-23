import { it, expect } from 'vitest';
import { summarizeTodos } from '../src/features/todos/summary.js';
import type { Todo } from '../src/features/todos/types.js';

it('calculates summary correctly for empty, partial and full completion', () => {
  const empty: Todo[] = [];
  expect(summarizeTodos(empty)).toEqual({ total: 0, active: 0, completed: 0, completionPercent: 0 });
  const todos: Todo[] = [
    { id: 1, completed: true } as Todo,
    { id: 2, completed: false } as Todo,
    { id: 3, completed: false } as Todo,
  ];
  expect(summarizeTodos(todos)).toEqual({ total: 3, active: 2, completed: 1, completionPercent: 33 });
  const allDone: Todo[] = [
    { id: 1, completed: true } as Todo,
    { id: 2, completed: true } as Todo,
  ];
  expect(summarizeTodos(allDone)).toEqual({ total: 2, active: 0, completed: 2, completionPercent: 100 });
});