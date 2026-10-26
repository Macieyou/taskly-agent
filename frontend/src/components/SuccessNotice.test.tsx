import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { renderWithTheme } from '../test/renderWithTheme'
import { SuccessNotice } from './SuccessNotice'

it('renders nothing without a message', () => {
  const { container } = renderWithTheme(<SuccessNotice message="" />)
  expect(container).toBeEmptyDOMElement()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

it('announces success messages and removes the notice when cleared', () => {
  const { container, rerender } = renderWithTheme(
    <SuccessNotice message="Task created." />,
  )
  expect(screen.getByRole('status')).toHaveTextContent('Task created.')
  rerender(<SuccessNotice message="Task deleted." />)
  expect(screen.getAllByRole('status')).toHaveLength(1)
  expect(screen.getByRole('status')).toHaveTextContent('Task deleted.')
  expect(screen.queryByText('Task created.')).not.toBeInTheDocument()
  rerender(<SuccessNotice message="" />)
  expect(container).toBeEmptyDOMElement()
})
