/**
 * Email notification helpers for Inngest pipeline steps.
 *
 * These functions look up the user's email from the DB and fire
 * the appropriate notification. They are safe to call from any
 * Inngest step — failures never propagate (fire-and-forget).
 *
 * All functions also persist a notification record to the DB
 * so the in-app notification centre can display them.
 */

import { getDb, createNotification } from "@/lib/db";
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

/** Resolve the user_id from a test_runs or security_agent_runs row. */
async function resolveUserId(runId: string): Promise<string | null> {
  try {
    const sql = getDb();
    let rows = await sql`SELECT user_id FROM test_runs WHERE id = ${runId} LIMIT 1`;
    if (rows.length > 0 && rows[0].user_id) return rows[0].user_id as string;
    rows = await sql`SELECT user_id FROM security_agent_runs WHERE id = ${runId} LIMIT 1`;
    if (rows.length > 0 && rows[0].user_id) return rows[0].user_id as string;
  } catch { /* ignore */ }
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
    const [email, userId, projectName] = await Promise.all([
      opts.email ? Promise.resolve(opts.email) : resolveEmail(opts.runId),
      resolveUserId(opts.runId),
      resolveProjectName(opts.sandboxId),
    ]);
    const reportUrl = `${brevoConfig.appUrl}/console/testing?scanId=${encodeURIComponent(opts.runId)}`;

    if (userId) {
      await createNotification({
        userId,
        type: "info",
        title: `Scan Started: ${projectName}`,
        message: `A ${opts.scanType ?? "Full Suite"} scan has started for ${projectName}.`,
        link: reportUrl,
        metadata: { runId: opts.runId, scanType: opts.scanType },
      });
    }

    if (!email) return;
    const { subject, html } = scanStartedHtml({
      projectName,
      scanId: opts.runId,
      scanType: opts.scanType,
      reportUrl,
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
  logs?: Array<{ level: string; message: string }>;
  errors?: string[];
}): Promise<void> {
  try {
    const [email, userId, projectName] = await Promise.all([
      opts.email ? Promise.resolve(opts.email) : resolveEmail(opts.runId),
      resolveUserId(opts.runId),
      resolveProjectName(opts.sandboxId),
    ]);
    const reportUrl = `${brevoConfig.appUrl}/console/testing?scanId=${encodeURIComponent(opts.runId)}`;
    const successRate = opts.totalChecks > 0 ? opts.passed / opts.totalChecks : 1;

    if (userId) {
      await createNotification({
        userId,
        type: successRate >= 0.5 ? "test_complete" : "test_failed",
        title: `Scan Complete: ${projectName}`,
        message: `${opts.passed}/${opts.totalChecks} checks passed${opts.score !== undefined ? `, score: ${opts.score}/100` : ""}. ${opts.failed} failed.`,
        link: reportUrl,
        metadata: { runId: opts.runId, score: opts.score, passed: opts.passed, failed: opts.failed },
      });
    }

    if (!email) return;
    const { subject, html } = scanCompletedHtml({
      projectName,
      scanId: opts.runId,
      totalChecks: opts.totalChecks,
      passed: opts.passed,
      failed: opts.failed,
      score: opts.score,
      summary: opts.summary,
      reportUrl,
      logs: opts.logs,
      errors: opts.errors,
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
    const [email, userId, projectName] = await Promise.all([
      opts.email ? Promise.resolve(opts.email) : resolveEmail(opts.runId),
      resolveUserId(opts.runId),
      resolveProjectName(opts.sandboxId),
    ]);
    const reportUrl = `${brevoConfig.appUrl}/console/testing?scanId=${encodeURIComponent(opts.runId)}`;

    if (userId) {
      await createNotification({
        userId,
        type: "vulnerability",
        title: `${opts.severity.toUpperCase()}: ${opts.vulnerability}`,
        message: opts.details ?? `A ${opts.severity} vulnerability was detected in ${projectName}.`,
        link: reportUrl,
        metadata: { runId: opts.runId, severity: opts.severity, vulnerability: opts.vulnerability },
      });
    }

    if (!email) return;
    const { subject, html } = vulnerabilityDetectedHtml({
      projectName,
      scanId: opts.runId,
      severity: opts.severity,
      vulnerability: opts.vulnerability,
      details: opts.details,
      reportUrl,
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
    const [email, userId, projectName] = await Promise.all([
      opts.email ? Promise.resolve(opts.email) : resolveEmail(opts.runId),
      resolveUserId(opts.runId),
      resolveProjectName(opts.sandboxId),
    ]);
    const reportUrl = `${brevoConfig.appUrl}/console/testing?scanId=${encodeURIComponent(opts.runId)}`;

    if (userId) {
      await createNotification({
        userId,
        type: "critical",
        title: `Critical: ${opts.vulnerability} in ${projectName}`,
        message: opts.details ?? `Critical vulnerability detected${opts.route ? ` at ${opts.route}` : ""}.`,
        link: reportUrl,
        metadata: { runId: opts.runId, vulnerability: opts.vulnerability, route: opts.route },
      });
    }

    if (!email) return;
    const { subject, html } = criticalAlertHtml({
      projectName,
      scanId: opts.runId,
      vulnerability: opts.vulnerability,
      details: opts.details,
      route: opts.route,
      reportUrl,
    });
    await sendEmail(email, subject, html);
  } catch { /* fire-and-forget */ }
}
