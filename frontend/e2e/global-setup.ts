import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** Start every E2E run from an empty "-test" database. */
export default function globalSetup() {
  execSync('bun run test:db:reset', {
    cwd: fileURLToPath(new URL('../../backend', import.meta.url)),
    stdio: 'inherit',
  })
}
