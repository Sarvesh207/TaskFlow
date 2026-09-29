/**
 * The real server, on the "-test" database. Used by the frontend's Playwright
 * E2E run (`bun run test:serve`, PORT set by the caller).
 */
import { applyTestEnv } from "../test-env";

applyTestEnv();
// Expected 4xx warnings would drown the Playwright output. DEBUG_TESTS=1 shows them.
if (!process.env.DEBUG_TESTS) console.warn = () => {};
await import("../../server");
