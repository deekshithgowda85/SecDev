/**
 * Shared Neon PostgreSQL connection + one-time table bootstrap.
 *
 * All tables are created here so every module (deployer, env-store, …)
 * calls the same ensureTables() rather than each bootstrapping its own.
 */

import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is not set");
  return neon(url);
}

let tablesReady = false;

export async function ensureTables(): Promise<void> {
  if (tablesReady) return;
  const sql = getDb();

  // Deployments — one row per sandbox
  await sql`
    CREATE TABLE IF NOT EXISTS deployments (
      sandbox_id  TEXT PRIMARY KEY,
      repo_url    TEXT        NOT NULL,
      repo_name   TEXT        NOT NULL,
      branch      TEXT        NOT NULL DEFAULT 'main',
      public_url  TEXT        NOT NULL,
      logs_url    TEXT        NOT NULL,
      status      TEXT        NOT NULL DEFAULT 'deploying',
      started_at  BIGINT      NOT NULL
    )
  `;

  // Per-deployment log lines
  await sql`
    CREATE TABLE IF NOT EXISTS deployment_logs (
      id          BIGSERIAL   PRIMARY KEY,
      sandbox_id  TEXT        NOT NULL,
      ts          BIGINT      NOT NULL,
      level       TEXT        NOT NULL DEFAULT 'info',
      msg         TEXT        NOT NULL
    )
  `;

  // Index for fast per-deployment log queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_deployment_logs_sandbox
      ON deployment_logs (sandbox_id, id)
  `;

  // Encrypted env vars per project
  await sql`
    CREATE TABLE IF NOT EXISTS env_vars (
      project TEXT NOT NULL,
      key     TEXT NOT NULL,
      value   TEXT NOT NULL,
      PRIMARY KEY (project, key)
    )
  `;

  tablesReady = true;
}
