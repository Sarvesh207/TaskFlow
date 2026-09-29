/**
 * Creates the test database if needed and syncs prisma/schema.prisma into it.
 * Non-destructive: tests clear their own rows. If a schema change would lose
 * data, `prisma db push` stops and asks - drop the "-test" database by hand then.
 * Run with `bun run test:db:setup`.
 */
import { Client } from "pg";
import { applyTestEnv } from "../test-env";

applyTestEnv();

const testUrl = new URL(process.env.DATABASE_URL!);
const dbName = decodeURIComponent(testUrl.pathname.slice(1));

// Connect to the maintenance database to create the test one.
const adminUrl = new URL(testUrl);
adminUrl.pathname = "/postgres";
const admin = new Client({ connectionString: adminUrl.toString() });
await admin.connect();
const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
if (!rowCount) {
  await admin.query(`CREATE DATABASE "${dbName.replaceAll('"', '""')}"`);
  console.log(`Created database ${dbName}`);
}
await admin.end();

const push = Bun.spawnSync(
  ["bunx", "prisma", "db", "push", "--url", testUrl.toString()],
  { stdout: "inherit", stderr: "inherit" },
);
if (push.exitCode !== 0) process.exit(push.exitCode ?? 1);

console.log(`Test database ${dbName} is ready.`);
