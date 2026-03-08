/**
 * Email controller: validates incoming payloads and dispatches
 * to the appropriate template + sendEmail.
 *
 * Used by the Next.js API routes under /api/email/*.
 */

import { sendEmail } from "./mail-service";
import { brevoConfig } from "./brevo";
import {
  scanStartedHtml,
  vulnerabilityDetectedHtml,
  scanCompletedHtml,
  criticalAlertHtml,
} from "./templates";

/* ── shared validation ────────────────────────────────────────────────── */

interface BasePayload {
  email: string;
  projectName: string;
  scanId: string;
}

function validateBase(body: unknown): { ok: true; data: BasePayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON body" };
  const b = body as Record<string, unknown>;
  if (typeof b.email !== "string" || !b.email) return { ok: false, error: "email is required" };
  if (typeof b.projectName !== "string" || !b.projectName) return { ok: false, error: "projectName is required" };
  if (typeof b.scanId !== "string" || !b.scanId) return { ok: false, error: "scanId is required" };
  return { ok: true, data: { email: b.email, projectName: b.projectName, scanId: b.scanId } };
}

function reportUrl(scanId: string, custom?: string): string {
  return custom ?? `${brevoConfig.appUrl}/console/testing?scanId=${encodeURIComponent(scanId)}`;
}

/* ── handlers ─────────────────────────────────────────────────────────── */

export async function handleScanStart(body: unknown) {
  const v = validateBase(body);
  if (!v.ok) return { ok: false, error: v.error, status: 400 };
  const b = body as Record<string, unknown>;
  const { subject, html } = scanStartedHtml({
    projectName: v.data.projectName,
    scanId: v.data.scanId,
    scanType: typeof b.scanType === "string" ? b.scanType : undefined,
    reportUrl: reportUrl(v.data.scanId, typeof b.reportUrl === "string" ? b.reportUrl : undefined),
  });
  const result = await sendEmail(v.data.email, subject, html);
  return { ...result, status: result.ok ? 200 : 502 };
}

export async function handleVulnerability(body: unknown) {
  const v = validateBase(body);
  if (!v.ok) return { ok: false, error: v.error, status: 400 };
  const b = body as Record<string, unknown>;
  if (typeof b.severity !== "string" || !b.severity) return { ok: false, error: "severity is required", status: 400 };
  if (typeof b.vulnerability !== "string" || !b.vulnerability) return { ok: false, error: "vulnerability is required", status: 400 };
  const { subject, html } = vulnerabilityDetectedHtml({
    projectName: v.data.projectName,
    scanId: v.data.scanId,
    severity: b.severity,
    vulnerability: b.vulnerability,
    details: typeof b.details === "string" ? b.details : undefined,
    reportUrl: reportUrl(v.data.scanId, typeof b.reportUrl === "string" ? b.reportUrl : undefined),
  });
  const result = await sendEmail(v.data.email, subject, html);
  return { ...result, status: result.ok ? 200 : 502 };
}

export async function handleScanComplete(body: unknown) {
  const v = validateBase(body);
  if (!v.ok) return { ok: false, error: v.error, status: 400 };
  const b = body as Record<string, unknown>;
  const { subject, html } = scanCompletedHtml({
    projectName: v.data.projectName,
    scanId: v.data.scanId,
    totalChecks: typeof b.totalChecks === "number" ? b.totalChecks : 0,
    passed: typeof b.passed === "number" ? b.passed : 0,
    failed: typeof b.failed === "number" ? b.failed : 0,
    score: typeof b.score === "number" ? b.score : undefined,
    summary: typeof b.summary === "string" ? b.summary : undefined,
    reportUrl: reportUrl(v.data.scanId, typeof b.reportUrl === "string" ? b.reportUrl : undefined),
  });
  const result = await sendEmail(v.data.email, subject, html);
  return { ...result, status: result.ok ? 200 : 502 };
}

export async function handleCriticalAlert(body: unknown) {
  const v = validateBase(body);
  if (!v.ok) return { ok: false, error: v.error, status: 400 };
  const b = body as Record<string, unknown>;
  if (typeof b.vulnerability !== "string" || !b.vulnerability) return { ok: false, error: "vulnerability is required", status: 400 };
  const { subject, html } = criticalAlertHtml({
    projectName: v.data.projectName,
    scanId: v.data.scanId,
    vulnerability: b.vulnerability,
    details: typeof b.details === "string" ? b.details : undefined,
    route: typeof b.route === "string" ? b.route : undefined,
    reportUrl: reportUrl(v.data.scanId, typeof b.reportUrl === "string" ? b.reportUrl : undefined),
  });
  const result = await sendEmail(v.data.email, subject, html);
  return { ...result, status: result.ok ? 200 : 502 };
}
