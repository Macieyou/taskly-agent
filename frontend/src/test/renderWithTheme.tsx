import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { theme } from '../design-system/theme/theme'

/** Render real styled components without mocking the design system. */
export function renderWithTheme(ui: ReactNode) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    ),
  })
}
