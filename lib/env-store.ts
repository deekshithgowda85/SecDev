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

import { encrypt, decrypt } from "./crypto";
import { getDb, ensureTables } from "./db";

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
