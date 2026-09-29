// Loaded by `bun test` before any test file (see bunfig.toml).
import { applyTestEnv } from "./test-env";

applyTestEnv();

// Expected 4xx responses are logged as warnings by the error middleware; keep
// test output readable. Set DEBUG_TESTS=1 to see them.
if (!process.env.DEBUG_TESTS) {
  console.warn = () => {};
}
