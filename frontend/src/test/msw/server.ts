import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/** Shared MSW server. Use `server.use(...)` in a test to override one endpoint. */
export const server = setupServer(...handlers)
