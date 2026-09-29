import bcrypt from "bcrypt";

// Tests register many users; full-strength hashing would make the suite crawl.
const SALT_ROUNDS = process.env.NODE_ENV === "test" ? 4 : 12;

export function hashPassword(password: string) {
  const hashedPassword = bcrypt.hash(password, SALT_ROUNDS);

  return hashedPassword;
}

export function comparePassword(password: string, hashPassword: string) {
  return bcrypt.compare(password, hashPassword);
}
