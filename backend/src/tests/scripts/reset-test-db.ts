/** Empties the "-test" database. Used before an E2E run (`bun run test:db:reset`). */
import { applyTestEnv } from "../test-env";

applyTestEnv();
const { resetDb, prisma } = await import("../helpers/db");
await resetDb();
await prisma.$disconnect();
console.log("Test database emptied.");
