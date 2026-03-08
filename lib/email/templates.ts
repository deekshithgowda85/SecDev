/**
 * Email HTML templates for the SecDev notification service.
 *
 * All templates produce self-contained HTML emails with inline styles.
 * No user-supplied strings are injected raw — everything is escaped.
 */

import { brevoConfig } from "./brevo";

/* ── helpers ──────────────────────────────────────────────────────────────── */

/** HTML-escape a string to prevent injection in email bodies. */
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;color:#18181b;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <!-- header -->
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 32px;">
      <h1 style="margin:0;font-size:18px;color:#ffffff;">🛡️ SecDev</h1>
    </div>
    <!-- body -->
    <div style="padding:32px;">
      <h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">${title}</h2>
      ${body}
    </div>
    <!-- footer -->
    <div style="padding:16px 32px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;text-align:center;">
      <a href="${esc(brevoConfig.appUrl)}" style="color:#4f46e5;text-decoration:none;">SecDev</a> — Automated Security Testing Platform
    </div>
  </div>
</body>
</html>`;
}

function badge(color: string, text: string): string {
  return `<span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;background:${color};color:#fff;">${esc(text)}</span>`;
}

function link(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">${esc(label)}</a>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 12px 6px 0;font-size:13px;color:#71717a;white-space:nowrap;">${esc(label)}</td><td style="padding:6px 0;font-size:13px;color:#18181b;font-weight:500;">${value}</td></tr>`;
}

function table(rows: string): string {
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>`;
}

/* ── public template functions ────────────────────────────────────────────── */

export interface ScanStartedParams {
  projectName: string;
  scanId: string;
  scanType?: string;
  reportUrl?: string;
}

export function scanStartedHtml(p: ScanStartedParams): { subject: string; html: string } {
  const subject = `🔍 Scan Started — ${p.projectName}`;
  const html = wrap(
    "Security Scan Started",
    `<p style="font-size:14px;color:#52525b;line-height:1.6;">
      A new scan has been initiated for <strong>${esc(p.projectName)}</strong>.
    </p>` +
    table(
      row("Project", esc(p.projectName)) +
      row("Scan ID", `<code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;font-size:12px;">${esc(p.scanId)}</code>`) +
      row("Type", esc(p.scanType ?? "Full Suite")) +
      row("Status", badge("#eab308", "Running"))
    ) +
    (p.reportUrl ? link(p.reportUrl, "View Live Progress →") : ""),
  );
  return { subject, html };
}

export interface VulnerabilityDetectedParams {
  projectName: string;
  scanId: string;
  severity: string;
  vulnerability: string;
  details?: string;
  reportUrl?: string;
}

export function vulnerabilityDetectedHtml(p: VulnerabilityDetectedParams): { subject: string; html: string } {
  const severityColors: Record<string, string> = {
    critical: "#dc2626",
    high: "#ea580c",
    medium: "#eab308",
    low: "#3b82f6",
    info: "#6b7280",
  };
  const color = severityColors[p.severity.toLowerCase()] ?? "#6b7280";
  const subject = `⚠️ Vulnerability Found [${p.severity.toUpperCase()}] — ${p.projectName}`;
  const html = wrap(
    "Vulnerability Detected",
    `<p style="font-size:14px;color:#52525b;line-height:1.6;">
      A vulnerability was detected during the scan of <strong>${esc(p.projectName)}</strong>.
    </p>` +
    table(
      row("Project", esc(p.projectName)) +
      row("Scan ID", `<code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;font-size:12px;">${esc(p.scanId)}</code>`) +
      row("Severity", badge(color, p.severity.toUpperCase())) +
      row("Vulnerability", esc(p.vulnerability)) +
      (p.details ? row("Details", esc(p.details)) : "")
    ) +
    (p.reportUrl ? link(p.reportUrl, "View Full Report →") : ""),
  );
  return { subject, html };
}

export interface ScanCompletedParams {
  projectName: string;
  scanId: string;
  totalChecks: number;
  passed: number;
  failed: number;
  score?: number;
  summary?: string;
  reportUrl?: string;
}

export function scanCompletedHtml(p: ScanCompletedParams): { subject: string; html: string } {
  const scoreColor = (p.score ?? 0) >= 80 ? "#16a34a" : (p.score ?? 0) >= 50 ? "#eab308" : "#dc2626";
  const subject = `✅ Scan Complete — ${p.projectName} (${p.passed}/${p.totalChecks} passed)`;
  const html = wrap(
    "Scan Completed",
    `<p style="font-size:14px;color:#52525b;line-height:1.6;">
      The security scan for <strong>${esc(p.projectName)}</strong> has finished.
    </p>` +
    (p.score !== undefined
      ? `<div style="text-align:center;margin:20px 0;">
          <span style="font-size:48px;font-weight:800;color:${scoreColor};">${p.score}</span>
          <span style="font-size:20px;color:#a1a1aa;">/100</span>
          <p style="font-size:13px;color:#71717a;margin-top:4px;">Overall Health Score</p>
        </div>`
      : "") +
    table(
      row("Project", esc(p.projectName)) +
      row("Scan ID", `<code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;font-size:12px;">${esc(p.scanId)}</code>`) +
      row("Total Checks", String(p.totalChecks)) +
      row("Passed", `<span style="color:#16a34a;font-weight:600;">${p.passed}</span>`) +
      row("Failed", `<span style="color:#dc2626;font-weight:600;">${p.failed}</span>`) +
      row("Status", badge("#16a34a", "Completed"))
    ) +
    (p.summary ? `<p style="font-size:13px;color:#52525b;margin-top:12px;padding:12px;background:#f4f4f5;border-radius:8px;">${esc(p.summary)}</p>` : "") +
    (p.reportUrl ? link(p.reportUrl, "View Detailed Report →") : ""),
  );
  return { subject, html };
}

export interface CriticalAlertParams {
  projectName: string;
  scanId: string;
  vulnerability: string;
  details?: string;
  route?: string;
  reportUrl?: string;
}

export function criticalAlertHtml(p: CriticalAlertParams): { subject: string; html: string } {
  const subject = `🚨 CRITICAL — ${p.vulnerability} in ${p.projectName}`;
  const html = wrap(
    "🚨 Critical Vulnerability Alert",
    `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="font-size:14px;color:#991b1b;font-weight:600;margin:0;">
        A critical vulnerability requires immediate attention.
      </p>
    </div>` +
    table(
      row("Project", esc(p.projectName)) +
      row("Scan ID", `<code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;font-size:12px;">${esc(p.scanId)}</code>`) +
      row("Severity", badge("#dc2626", "CRITICAL")) +
      row("Vulnerability", esc(p.vulnerability)) +
      (p.route ? row("Affected Route", `<code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;font-size:12px;">${esc(p.route)}</code>`) : "") +
      (p.details ? row("Details", esc(p.details)) : "")
    ) +
    (p.reportUrl ? link(p.reportUrl, "Investigate Now →") : ""),
  );
  return { subject, html };
}
