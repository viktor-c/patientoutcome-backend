import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const saltRounds = Number.parseInt(process.env.HASH_SALT_ROUNDS || "10", 10);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
