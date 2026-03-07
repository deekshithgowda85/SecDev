/**
 * Env-var store backed by Neon PostgreSQL (serverless).
 *
 * Values are encrypted with AES-256-GCM using the NEXTAUTH_SECRET before
 * being written to the DB, so secrets are never stored in plaintext.
 *
 * Data persists across:
 *  - app restarts            ✓
 *  - server/machine restarts ✓
 *  - sandbox terminations    ✓
 *  - multiple app instances  ✓  (shared Neon DB)
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getDb, ensureTables } from "./db";

// ── DB helpers ─────────────────────────────────────────────────────────────────

function getKey(): Buffer {
  const raw = process.env.NEXTAUTH_SECRET ?? "default-dev-secret-32-chars-long";
  return createHash("sha256").update(raw).digest();
}

function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return (
    decipher.update(Buffer.from(dataHex, "hex")).toString("utf8") +
    decipher.final("utf8")
  );
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Returns plaintext env vars for a project. */
export async function getEnvVars(
  repoName: string
): Promise<Record<string, string>> {
  await ensureTables();
  const sql = getDb();
  const rows = await sql`
    SELECT key, value FROM env_vars WHERE project = ${repoName}
  `;
  const result: Record<string, string> = {};
  for (const row of rows) {
    try {
      result[row.key as string] = decrypt(row.value as string);
    } catch {
      result[row.key as string] = "";
    }
  }
  return result;
}

/** Returns masked env vars for display UI. */
export async function listEnvVars(
  repoName: string
): Promise<Array<{ key: string; maskedValue: string }>> {
  await ensureTables();
  const sql = getDb();
  const rows = await sql`
    SELECT key, value FROM env_vars WHERE project = ${repoName} ORDER BY key
  `;
  return rows.map((row) => {
    let plain = "";
    try {
      plain = decrypt(row.value as string);
    } catch {
      plain = "";
    }
    const maskedValue =
      plain.length > 4
        ? `${"*".repeat(plain.length - 4)}${plain.slice(-4)}`
        : "****";
    return { key: row.key as string, maskedValue };
  });
}

/** Upsert a single env var (value is encrypted). */
export async function setEnvVar(
  repoName: string,
  key: string,
  value: string
): Promise<void> {
  await ensureTables();
  const sql = getDb();
  const enc = encrypt(value);
  await sql`
    INSERT INTO env_vars (project, key, value)
    VALUES (${repoName}, ${key}, ${enc})
    ON CONFLICT (project, key) DO UPDATE SET value = EXCLUDED.value
  `;
}

/** Delete a single env var. */
export async function deleteEnvVar(
  repoName: string,
  key: string
): Promise<void> {
  await ensureTables();
  const sql = getDb();
  await sql`
    DELETE FROM env_vars WHERE project = ${repoName} AND key = ${key}
  `;
}
