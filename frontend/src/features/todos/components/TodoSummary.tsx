import styled from 'styled-components'
import type { Todo } from '../types'

const Summary = styled.section`
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surface};
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};

  h2 {
    font-size: 1rem;
  }
  dl {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin: 0;
  }
  dt {
    color: ${({ theme }) => theme.colors.inkMuted};
    font-size: 0.85rem;
  }
  dd {
    margin: 0;
    color: ${({ theme }) => theme.colors.inkStrong};
    font-size: 1.75rem;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
  progress {
    display: block;
    width: 100%;
    height: 8px;
    border: 0;
    border-radius: 999px;
    overflow: hidden;
    accent-color: ${({ theme }) => theme.colors.primary};
  }
  progress::-webkit-progress-bar {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
  progress::-webkit-progress-value {
    background: ${({ theme }) => theme.colors.primary};
    border-radius: 999px;
  }
  progress::-moz-progress-bar {
    background: ${({ theme }) => theme.colors.primary};
  }
  small {
    color: ${({ theme }) => theme.colors.inkMuted};
    font-variant-numeric: tabular-nums;
  }
`

/** Derive from the loaded list: no duplicate request or stale parallel cache. */
export function TodoSummary({ todos }: { todos: readonly Todo[] }) {
  const completed = todos.reduce(
    (count, todo) => count + Number(todo.completed),
    0,
  )
  const percent =
    todos.length === 0 ? 0 : Math.round((completed / todos.length) * 100)
  return (
    <Summary aria-label="Task overview">
      <div className="row spread">
        <h2>Your progress</h2>
        <small>{percent}% complete</small>
      </div>
      <dl>
        <div>
          <dt>Total tasks</dt>
          <dd>{todos.length}</dd>
        </div>
        <div>
          <dt>To do</dt>
          <dd>{todos.length - completed}</dd>
        </div>
        <div>
          <dt>Completed</dt>
          <dd>{completed}</dd>
        </div>
      </dl>
      <progress aria-label="Task completion" value={percent} max={100} />
    </Summary>
  )
}
