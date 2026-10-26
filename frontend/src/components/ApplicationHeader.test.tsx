import { screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { renderWithTheme } from '../test/renderWithTheme'
import { ApplicationHeader } from './ApplicationHeader'

it('provides a home link, application title and task list description', () => {
  renderWithTheme(<ApplicationHeader />)
  const header = screen.getByRole('banner')
  const link = within(header).getByRole('link', {
    name: 'Taskly App Node — home',
  })
  expect(link).toHaveAttribute('href', '/')
  expect(
    within(link).getByRole('heading', { name: 'Taskly App Node', level: 2 }),
  ).toBeVisible()
  expect(within(header).getByText('Task list')).toBeVisible()
})
