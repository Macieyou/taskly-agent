import type { ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { afterEach } from 'vitest'
import { AppProviders } from '../app/AppProviders'

const clients = new Set<QueryClient>()

afterEach(() => {
  for (const client of clients) client.clear()
  clients.clear()
})

export function renderWithProviders(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  clients.add(client)
  return {
    ...render(children, {
      wrapper: ({ children }) => (
        <AppProviders client={client}>{children}</AppProviders>
      ),
    }),
    client,
  }
}
