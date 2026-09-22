import prisma from "../../db/prisma";
import type { UpdateUserInput } from "./users.schema";

// Never select password_hash — these rows are returned straight to the client.
const userSelect = {
  id: true,
  email: true,
  full_name: true,
  created_at: true,
  updated_at: true,
  profile: true,
} as const;

export async function findAllUsers() {
  const users = prisma.users.findMany({
    select: userSelect,
    orderBy: {
      created_at: "desc",
    },
  });

  return users;
}
export async function findUser(id: string) {
  return prisma.users.findUnique({
    where: {
      id,
    },
    select: userSelect,
  });
}
export async function updateUser(id: string, data: UpdateUserInput) {
  const { email, full_name, avatar_url, bio, phone } = data;

  const userData = {
    ...(email !== undefined && { email }),
    ...(full_name !== undefined && { full_name }),
  };

  const userProfileData = {
    ...(avatar_url !== undefined && { avatar_url }),
    ...(bio !== undefined && { bio }),
    ...(phone !== undefined && { phone }),
  };

  return prisma.users.update({
    where: {
      id,
    },
    data: {
      ...userData,
      ...(Object.keys(userProfileData).length > 0 && {
        profile: {
          update: userProfileData,
        },
      }),
    },
    select: userSelect,
  });
}

export async function deleteUser(id: string) {
  return await prisma.users.delete({
    where: { id },
  });
}
