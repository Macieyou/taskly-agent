import { render, screen } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { TodoSummary } from './TodoSummary';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../../design-system';

vi.mock('../../../design-system', async () => {
  const actual = await vi.importActual('../../../design-system');
  return { ...actual };
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

it('displays correct summary information', () => {
  const todos = [
    { id: 1, completed: true },
    { id: 2, completed: false },
  ] as any;
  renderWithTheme(<TodoSummary todos={todos} />);
  expect(screen.getByText('50% complete')).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
  expect(screen.getByLabelText('Task completion')).toHaveValue(50);
});