import prisma from "../../db/prisma";
import { assertTestDatabase } from "../test-env";

/** Empty every application table. Only ever runs against a "-test" database. */
export async function resetDb(): Promise<void> {
  assertTestDatabase();
  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE tasks, project_members, projects, user_profiles, users RESTART IDENTITY CASCADE",
  );
}

export { prisma };
