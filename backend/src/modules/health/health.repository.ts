import prisma from "../../db/prisma";

/** Resolves when the database answers; rejects when it does not. */
export async function pingDatabase() {
  await prisma.$queryRaw`SELECT 1`;
}
