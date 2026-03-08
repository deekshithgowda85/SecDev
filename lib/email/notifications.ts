/**
 * Email notification helpers for Inngest pipeline steps.
 *
 * These functions look up the user's email from the DB and fire
 * the appropriate notification. They are safe to call from any
 * Inngest step — failures never propagate (fire-and-forget).
 */

import { getDb } from "@/lib/db";
import { sendEmail } from "./mail-service";
import { brevoConfig } from "./brevo";
import {
  scanStartedHtml,
  scanCompletedHtml,
  vulnerabilityDetectedHtml,
  criticalAlertHtml,
} from "./templates";

/* ── helpers ──────────────────────────────────────────────────────────── */

/** Resolve the user email from a test_runs or security_agent_runs row. */
async function resolveEmail(runId: string): Promise<string | null> {
  try {
    const sql = getDb();
    // Try test_runs first
    let rows = await sql`
      SELECT u.email FROM test_runs tr
      JOIN users u ON u.id = tr.user_id
      WHERE tr.id = ${runId} LIMIT 1
    `;
    if (rows.length > 0 && rows[0].email) return rows[0].email;

    // Try security_agent_runs
    rows = await sql`
      SELECT u.email FROM security_agent_runs sar
      JOIN users u ON u.id = sar.user_id
      WHERE sar.id = ${runId} LIMIT 1
    `;
    if (rows.length > 0 && rows[0].email) return rows[0].email;
  } catch {
    // users table may not exist yet — silently skip
  }
  return null;
}

/** Look up project name from sandbox. */
async function resolveProjectName(sandboxId: string): Promise<string> {
  try {
    const sql = getDb();
    const rows = await sql`SELECT repo_name FROM deployments WHERE sandbox_id = ${sandboxId} LIMIT 1`;
    if (rows.length > 0) return rows[0].repo_name;
  } catch { /* fallback */ }
  return sandboxId;
}

/* ── public notification functions ─────────────────────────────────────── */

/**
 * Notify user that a scan has started.
 * Safe to call from Inngest steps — never throws.
 */
export async function notifyScanStarted(opts: {
  runId: string;
  sandboxId: string;
  scanType?: string;
  email?: string;
}): Promise<void> {
  try {
    const email = opts.email ?? (await resolveEmail(opts.runId));
    if (!email) return;
    const projectName = await resolveProjectName(opts.sandboxId);
    const { subject, html } = scanStartedHtml({
      projectName,
      scanId: opts.runId,
      scanType: opts.scanType,
      reportUrl: `${brevoConfig.appUrl}/console/testing?scanId=${encodeURIComponent(opts.runId)}`,
    });
    await sendEmail(email, subject, html);
  } catch { /* fire-and-forget */ }
}

/**
 * Notify user that a scan has completed.
 */
export async function notifyScanCompleted(opts: {
  runId: string;
  sandboxId: string;
  totalChecks: number;
  passed: number;
  failed: number;
  score?: number;
  summary?: string;
  email?: string;
}): Promise<void> {
  try {
    const email = opts.email ?? (await resolveEmail(opts.runId));
    if (!email) return;
    const projectName = await resolveProjectName(opts.sandboxId);
    const { subject, html } = scanCompletedHtml({
      projectName,
      scanId: opts.runId,
      totalChecks: opts.totalChecks,
      passed: opts.passed,
      failed: opts.failed,
      score: opts.score,
      summary: opts.summary,
      reportUrl: `${brevoConfig.appUrl}/console/testing?scanId=${encodeURIComponent(opts.runId)}`,
    });
    await sendEmail(email, subject, html);
  } catch { /* fire-and-forget */ }
}

/**
 * Notify user about a vulnerability.
 */
export async function notifyVulnerability(opts: {
  runId: string;
  sandboxId: string;
  severity: string;
  vulnerability: string;
  details?: string;
  email?: string;
}): Promise<void> {
  try {
    const email = opts.email ?? (await resolveEmail(opts.runId));
    if (!email) return;
    const projectName = await resolveProjectName(opts.sandboxId);
    const { subject, html } = vulnerabilityDetectedHtml({
      projectName,
      scanId: opts.runId,
      severity: opts.severity,
      vulnerability: opts.vulnerability,
      details: opts.details,
      reportUrl: `${brevoConfig.appUrl}/console/testing?scanId=${encodeURIComponent(opts.runId)}`,
    });
    await sendEmail(email, subject, html);
  } catch { /* fire-and-forget */ }
}

/**
 * Notify user about a critical vulnerability.
 */
export async function notifyCritical(opts: {
  runId: string;
  sandboxId: string;
  vulnerability: string;
  details?: string;
  route?: string;
  email?: string;
}): Promise<void> {
  try {
    const email = opts.email ?? (await resolveEmail(opts.runId));
    if (!email) return;
    const projectName = await resolveProjectName(opts.sandboxId);
    const { subject, html } = criticalAlertHtml({
      projectName,
      scanId: opts.runId,
      vulnerability: opts.vulnerability,
      details: opts.details,
      route: opts.route,
      reportUrl: `${brevoConfig.appUrl}/console/testing?scanId=${encodeURIComponent(opts.runId)}`,
    });
    await sendEmail(email, subject, html);
  } catch { /* fire-and-forget */ }
}
