import { it, expect } from 'vitest';
import { summarizeTodos } from '../src/features/todos/summary.js';
import { todo } from './fixture.js';

it.each([
  { completed: [], expected: { total: 0, active: 0, completed: 0, completionPercent: 0 } },
  { completed: [false], expected: { total: 1, active: 1, completed: 0, completionPercent: 0 } },
  { completed: [true, false, false], expected: { total: 3, active: 2, completed: 1, completionPercent: 33 } },
  { completed: [true, true, false], expected: { total: 3, active: 1, completed: 2, completionPercent: 67 } },
  { completed: [true, true], expected: { total: 2, active: 0, completed: 2, completionPercent: 100 } },
])('summarizes completion states $completed without mutating input', ({ completed, expected }) => {
  const todos = Object.freeze(completed.map((done, id) => Object.freeze({ ...todo, id: id + 1, completed: done })));
  expect(summarizeTodos(todos)).toEqual(expected);
  expect(todos.map(item => item.completed)).toEqual(completed);
});
