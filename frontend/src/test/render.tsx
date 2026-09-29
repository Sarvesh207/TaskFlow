import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { createQueryClient } from '@/lib/query-client'
import { routes } from '@/router'
import { signInAs } from './msw/db'

function testQueryClient(): QueryClient {
  return createQueryClient({ queries: { retry: false, staleTime: 0 }, mutations: { retry: false } })
}

/**
 * Render the whole app at `path` against the MSW fake API.
 * `as` signs a seeded user in first; omit it to start signed out.
 */
export function renderApp(path: string, { as }: { as?: string | null } = {}) {
  signInAs(as ?? null)
  const queryClient = testQueryClient()
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  )
  return { ...utils, user, router, queryClient }
}

/** Render one component with a query client (and a router, for links). */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const queryClient = testQueryClient()
  const router = createMemoryRouter([{ path: '*', element: ui }])
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return {
    ...render(<RouterProvider router={router} />, { wrapper: Wrapper, ...options }),
    user: userEvent.setup(),
    queryClient,
  }
}
