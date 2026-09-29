import { afterAll, beforeAll, beforeEach } from "bun:test";
import { TestClient } from "../helpers/client";
import { resetDb } from "../helpers/db";
import { startServer, type TestServer } from "../helpers/server";

/**
 * Call at the top of each integration file: starts the real app on a free port
 * and empties the test database before every test.
 */
export function useTestServer() {
  const ctx = { baseUrl: "", anon: () => new TestClient(ctx.baseUrl) };
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
    ctx.baseUrl = server.baseUrl;
  });

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await server?.close();
  });

  return ctx;
}
