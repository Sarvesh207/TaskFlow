/**
 * Points everything at the test database. Imported first by the test preload,
 * the test server and the DB scripts - before `src/db/prisma.ts` builds its
 * client - so no test can ever touch the development database.
 */

const TEST_SUFFIX = "-test";

function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
}

/** `TEST_DATABASE_URL`, or `DATABASE_URL` with `-test` appended to the database name. */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error("Set DATABASE_URL (or TEST_DATABASE_URL) to run the tests.");
  }

  const url = new URL(base);
  const name = databaseName(base);
  if (!name.endsWith(TEST_SUFFIX)) url.pathname = `/${name}${TEST_SUFFIX}`;
  return url.toString();
}

/** Refuse to run against anything that is not clearly a test database. */
export function assertTestDatabase(url = process.env.DATABASE_URL): void {
  if (!url || !databaseName(url).endsWith(TEST_SUFFIX)) {
    throw new Error(
      `Refusing to use database "${url ? databaseName(url) : "<unset>"}" for tests: its name must end in "${TEST_SUFFIX}".`,
    );
  }
}

export function applyTestEnv(): void {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = testDatabaseUrl();
  process.env.JWT_SECRET ??= "test-secret";
  // Tests never reach Google: `modules/auth/google.ts` is mocked where it matters.
  process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:5173/api/v1/auth/google/callback";
  process.env.FRONTEND_URL = "http://localhost:5173";
  assertTestDatabase();
}
