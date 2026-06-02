import { randomBytes, randomUUID, pbkdf2 } from "crypto";
import { promisify } from "util";
import { getDb } from "@/lib/db";

const pbkdf2Async = promisify(pbkdf2);
const ITERATIONS = 310000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
};

export type UserProfile = {
  id: string;
  name?: string | null;
  email: string;
  createdAt: number;
};

async function ensureUserTable(): Promise<void> {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id             TEXT PRIMARY KEY,
      email          TEXT NOT NULL UNIQUE,
      password_hash  TEXT NOT NULL,
      created_at     BIGINT NOT NULL
    )
  `;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await pbkdf2Async(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)) as Buffer;
  return ["pbkdf2", ITERATIONS, salt, derivedKey.toString("hex")].join("$");
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [scheme, iterationsText, salt, expectedHex] = storedHash.split("$");

  if (scheme !== "pbkdf2" || !iterationsText || !salt || !expectedHex) {
    return false;
  }

  const iterations = Number.parseInt(iterationsText, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const derivedKey = (await pbkdf2Async(password, salt, iterations, KEY_LENGTH, DIGEST)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");

  if (expected.length !== derivedKey.length) {
    return false;
  }

  return expected.equals(derivedKey);
}

export async function createUser(email: string, password: string): Promise<string> {
  await ensureUserTable();

  const normalizedEmail = email.trim().toLowerCase();
  const sql = getDb();
  const existing = (await sql`
    SELECT id, email, password_hash
    FROM users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `) as UserRow[];

  if (existing.length > 0) {
    throw new Error("EMAIL_IN_USE");
  }

  const id = randomUUID();
  const passwordHash = await hashPassword(password);

  await sql`
    INSERT INTO users (id, email, password_hash, created_at)
    VALUES (${id}, ${normalizedEmail}, ${passwordHash}, ${Date.now()})
  `;

  return id;
}

export async function authenticateUser(email: string, password: string): Promise<string | null> {
  await ensureUserTable();

  const normalizedEmail = email.trim().toLowerCase();
  const sql = getDb();
  const rows = (await sql`
    SELECT id, email, password_hash
    FROM users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `) as UserRow[];

  const user = rows[0];
  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password_hash);
  return isValid ? user.id : null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  await ensureUserTable();

  if (!userId) {
    return null;
  }

  const sql = getDb();
  const rows = (await sql`
    SELECT id, email, created_at
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `) as Array<{ id: string; email: string; created_at: number }>;

  const user = rows[0];
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    createdAt: Number(user.created_at),
  };
}

export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  await ensureUserTable();

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const sql = getDb();
  const rows = (await sql`
    SELECT id, email, created_at
    FROM users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `) as Array<{ id: string; email: string; created_at: number }>;

  const user = rows[0];
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    createdAt: Number(user.created_at),
  };
}
