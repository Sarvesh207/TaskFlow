import prisma from "../../db/prisma";
import { prismaVersion } from "../../generated/prisma/internal/prismaNamespace";
import type { UserRegisterInput, UserLoginInput } from "./auth.schema";
import type { createGoogleUserRepo, createUserRepo } from "./auth.types";

export async function findUserByEmail(email: string) {
  return prisma.users.findUnique({
    where: { email },
  });
}

export async function createUser(data: createUserRepo) {
  return prisma.users.create({
    data,
    select: {
      id: true,
      email: true,
      full_name: true,
      created_at: true,
      updated_at: true,
    },
  });
}

const sessionUserSelect = {
  id: true,
  email: true,
  full_name: true,
} as const;

export async function findUserByGoogleId(googleId: string) {
  return prisma.users.findUnique({
    where: { google_id: googleId },
    select: sessionUserSelect,
  });
}

export async function linkGoogleId(userId: string, googleId: string) {
  return prisma.users.update({
    where: { id: userId },
    data: { google_id: googleId, updated_at: new Date() },
    select: sessionUserSelect,
  });
}

/** A Google-only account: no password, profile seeded with the Google avatar. */
export async function createGoogleUser(data: createGoogleUserRepo) {
  return prisma.users.create({
    data: {
      email: data.email,
      full_name: data.full_name,
      google_id: data.google_id,
      profile: { create: { avatar_url: data.avatar_url } },
    },
    select: sessionUserSelect,
  });
}

export async function findUserById(id: string) {
  return prisma.users.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      email: true,
      full_name: true,
      created_at: true,
      updated_at: true,
      profile: true,
    },
  });
}
