import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Drawer } from './Drawer'
import { ThemeProvider } from 'styled-components'
import { theme } from '../../theme/theme'

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
)

it('restores focus to the opener after closing', async () => {
  const user = userEvent.setup()
  const { rerender } = render(
    <Wrapper>
      <button>Opener</button>
      <Drawer title="Test" isOpen={false} onClose={vi.fn()}>
        <input />
      </Drawer>
    </Wrapper>,
  )
  const opener = screen.getByRole('button', { name: 'Opener' })
  await user.click(opener)
  rerender(
    <Wrapper>
      <button>Opener</button>
      <Drawer title="Test" isOpen={true} onClose={vi.fn()}>
        <input />
      </Drawer>
    </Wrapper>,
  )
  expect(screen.getByRole('dialog')).toBeVisible()
  rerender(
    <Wrapper>
      <button>Opener</button>
      <Drawer title="Test" isOpen={false} onClose={vi.fn()}>
        <input />
      </Drawer>
    </Wrapper>,
  )
  await waitFor(() => expect(opener).toHaveFocus())
})