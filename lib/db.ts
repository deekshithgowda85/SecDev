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

// Bump this version whenever schema migrations are added so ensureTables() re-runs
const SCHEMA_VERSION = 4;

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
      started_at  BIGINT      NOT NULL,
      user_id     TEXT        NOT NULL DEFAULT ''
    )
  `;
  // Migrate existing table: add user_id if missing
  await sql`ALTER TABLE deployments ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`;

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

  // ── Testing tables ────────────────────────────────────────────────────────

  // Test runs — one per triggered test batch
  await sql`
    CREATE TABLE IF NOT EXISTS test_runs (
      id          TEXT PRIMARY KEY,
      sandbox_id  TEXT NOT NULL,
      type        TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'running',
      created_at  BIGINT NOT NULL,
      finished_at BIGINT,
      summary     TEXT,
      user_id     TEXT NOT NULL DEFAULT ''
    )
  `;
  // Migrate existing table: add user_id if missing
  await sql`ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`;

  // Route health-check results
  await sql`
    CREATE TABLE IF NOT EXISTS test_results (
      id            BIGSERIAL PRIMARY KEY,
      run_id        TEXT NOT NULL,
      sandbox_id    TEXT NOT NULL,
      route         TEXT NOT NULL,
      status        TEXT NOT NULL,
      status_code   INT,
      response_time INT,
      error         TEXT,
      created_at    BIGINT NOT NULL
    )
  `;

  // Security scan results
  await sql`
    CREATE TABLE IF NOT EXISTS security_results (
      id          BIGSERIAL PRIMARY KEY,
      run_id      TEXT NOT NULL,
      sandbox_id  TEXT NOT NULL,
      route       TEXT NOT NULL,
      check_type  TEXT NOT NULL,
      result      TEXT NOT NULL,
      details     TEXT,
      severity    TEXT NOT NULL DEFAULT 'info',
      created_at  BIGINT NOT NULL
    )
  `;

  // API test results
  await sql`
    CREATE TABLE IF NOT EXISTS api_test_results (
      id            BIGSERIAL PRIMARY KEY,
      run_id        TEXT NOT NULL,
      sandbox_id    TEXT NOT NULL,
      endpoint      TEXT NOT NULL,
      method        TEXT NOT NULL,
      status        TEXT NOT NULL,
      status_code   INT,
      latency       INT,
      response_body TEXT,
      created_at    BIGINT NOT NULL
    )
  `;

  // Performance test results
  await sql`
    CREATE TABLE IF NOT EXISTS performance_results (
      id                  BIGSERIAL PRIMARY KEY,
      run_id              TEXT NOT NULL,
      sandbox_id          TEXT NOT NULL,
      route               TEXT NOT NULL,
      avg_response        INT,
      max_response        INT,
      min_response        INT,
      concurrent_requests INT,
      success_rate        REAL,
      created_at          BIGINT NOT NULL
    )
  `;

  // Vibetest browser-agent results (links, console errors, a11y, UI bugs)
  await sql`
    CREATE TABLE IF NOT EXISTS vibetest_results (
      id          BIGSERIAL PRIMARY KEY,
      run_id      TEXT      NOT NULL,
      sandbox_id  TEXT      NOT NULL,
      agent       TEXT      NOT NULL,
      category    TEXT      NOT NULL,
      status      TEXT      NOT NULL,
      finding     TEXT      NOT NULL,
      detail      TEXT,
      url         TEXT,
      created_at  BIGINT    NOT NULL
    )
  `;

  // ── Security Agent tables ─────────────────────────────────────────────

  // Full security agent scan runs
  await sql`
    CREATE TABLE IF NOT EXISTS security_agent_runs (
      id          TEXT PRIMARY KEY,
      sandbox_id  TEXT NOT NULL,
      user_id     TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'running',
      created_at  BIGINT NOT NULL,
      finished_at BIGINT,
      total_routes INT DEFAULT 0,
      overall_score INT,
      critical_count INT DEFAULT 0,
      high_count     INT DEFAULT 0,
      medium_count   INT DEFAULT 0,
      low_count      INT DEFAULT 0,
      summary     TEXT,
      ai_analysis TEXT
    )
  `;

  // Individual security agent findings
  await sql`
    CREATE TABLE IF NOT EXISTS security_agent_findings (
      id          BIGSERIAL PRIMARY KEY,
      run_id      TEXT NOT NULL,
      sandbox_id  TEXT NOT NULL,
      route       TEXT NOT NULL,
      check_type  TEXT NOT NULL,
      result      TEXT NOT NULL,
      severity    TEXT NOT NULL DEFAULT 'info',
      details     TEXT,
      payload     TEXT,
      created_at  BIGINT NOT NULL
    )
  `;

  // Per-run log lines (live logs for all test types)
  await sql`
    CREATE TABLE IF NOT EXISTS run_logs (
      id         BIGSERIAL PRIMARY KEY,
      run_id     TEXT      NOT NULL,
      level      TEXT      NOT NULL DEFAULT 'info',
      message    TEXT      NOT NULL,
      created_at BIGINT    NOT NULL
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_run_logs_run_id ON run_logs (run_id, id)
  `;

  // ── Attack Pipeline tables ────────────────────────────────────────────────

  // Full attack-pipeline scan runs
  await sql`
    CREATE TABLE IF NOT EXISTS attack_pipeline_runs (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL DEFAULT '',
      base_url        TEXT NOT NULL,
      sandbox_id      TEXT,
      status          TEXT NOT NULL DEFAULT 'running',
      created_at      BIGINT NOT NULL,
      finished_at     BIGINT,
      routes_found    INT DEFAULT 0,
      overall_score   INT,
      risk_level      TEXT,
      critical_count  INT DEFAULT 0,
      high_count      INT DEFAULT 0,
      medium_count    INT DEFAULT 0,
      low_count       INT DEFAULT 0,
      passed_count    INT DEFAULT 0,
      summary         TEXT,
      report_json     TEXT
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_attack_pipeline_runs_user
      ON attack_pipeline_runs (user_id, created_at DESC)
  `;

  tablesReady = true;
}

/**
 * Write a single log line for a test run.
 * Non-blocking — failures are silently ignored so they never break the test flow.
 */
export async function logRun(
  runId: string,
  message: string,
  level: "info" | "warn" | "error" | "success" = "info"
): Promise<void> {
  try {
    const sql = getDb();
    await sql`
      INSERT INTO run_logs (run_id, level, message, created_at)
      VALUES (${runId}, ${level}, ${message}, ${Date.now()})
    `;
  } catch { /* ignore — logs are best-effort */ }
}
