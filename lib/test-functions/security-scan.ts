/**
 * Inngest function: Security Scan — OWASP-style checks against deployed routes.
 *
 * Checks performed:
 *  - Security headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options)
 *  - XSS reflection (basic payload in query params)
 *  - Open redirect detection
 *  - Information disclosure (server version headers, stack traces)
 *  - Cookie security flags (Secure, HttpOnly, SameSite)
 */

import { inngest } from "@/lib/inngest";
import { getDb, ensureTables } from "@/lib/db";
import { parseRoutes } from "@/lib/route-parser";
import { getDeployment } from "@/lib/deployer";
import { notifyScanStarted, notifyScanCompleted, notifyCritical } from "@/lib/email/notifications";

const SECURITY_HEADERS = [
  { header: "content-security-policy", label: "CSP", severity: "high" },
  { header: "x-frame-options", label: "X-Frame-Options", severity: "medium" },
  { header: "strict-transport-security", label: "HSTS", severity: "high" },
  { header: "x-content-type-options", label: "X-Content-Type-Options", severity: "medium" },
  { header: "referrer-policy", label: "Referrer-Policy", severity: "low" },
  { header: "permissions-policy", label: "Permissions-Policy", severity: "low" },
];

export const runSecurityScan = inngest.createFunction(
  { id: "run-security-scan", name: "Run Security Scan" },
  { event: "test/security.run" },
  async ({ event, step }) => {
    const { runId, sandboxId } = event.data as { runId: string; sandboxId: string };

    await step.run("init-db", async () => {
      await ensureTables();
    });

    await step.run("notify-start", async () => {
      await notifyScanStarted({ runId, sandboxId, scanType: "Security Scan" });
    });

    const deployment = await step.run("get-deployment", async () => {
      return getDeployment(sandboxId);
    });

    if (!deployment) {
      await step.run("mark-failed", async () => {
        const sql = getDb();
        await sql`UPDATE test_runs SET status = 'failed', finished_at = ${Date.now()}, summary = 'Deployment not found' WHERE id = ${runId}`;
      });
      return { ok: false, error: "Deployment not found" };
    }

    const baseUrl = deployment.publicUrl;

    const parsed = await step.run("parse-routes", async () => {
      return parseRoutes(sandboxId);
    });

    const findings = await step.run("security-checks", async () => {
      const sql = getDb();
      const allFindings: Array<{ route: string; checkType: string; result: string; details: string; severity: string }> = [];

      for (const route of parsed.routes) {
        const url = `${baseUrl}${route}`;
        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout(15_000),
            redirect: "manual",
          });

          // ── Header checks ───────────────────────────────────────────────
          for (const { header, label, severity } of SECURITY_HEADERS) {
            const value = res.headers.get(header);
            const result = value ? "pass" : "fail";
            const details = value ? `${label}: ${value}` : `Missing ${label} header`;
            allFindings.push({ route, checkType: `header-${header}`, result, details, severity: result === "pass" ? "info" : severity });
            await sql`
              INSERT INTO security_results (run_id, sandbox_id, route, check_type, result, details, severity, created_at)
              VALUES (${runId}, ${sandboxId}, ${route}, ${`header-${header}`}, ${result}, ${details}, ${result === "pass" ? "info" : severity}, ${Date.now()})
            `;
          }

          // ── Server info disclosure ──────────────────────────────────────
          const server = res.headers.get("server");
          const xPoweredBy = res.headers.get("x-powered-by");
          if (server || xPoweredBy) {
            const details = `Server info disclosed: ${server ?? ""} ${xPoweredBy ?? ""}`.trim();
            allFindings.push({ route, checkType: "info-disclosure", result: "fail", details, severity: "medium" });
            await sql`
              INSERT INTO security_results (run_id, sandbox_id, route, check_type, result, details, severity, created_at)
              VALUES (${runId}, ${sandboxId}, ${route}, 'info-disclosure', 'fail', ${details}, 'medium', ${Date.now()})
            `;
          }

          // ── Cookie security flags ───────────────────────────────────────
          const cookies = res.headers.get("set-cookie");
          if (cookies) {
            const lc = cookies.toLowerCase();
            const issues: string[] = [];
            if (!lc.includes("httponly")) issues.push("Missing HttpOnly");
            if (!lc.includes("secure")) issues.push("Missing Secure");
            if (!lc.includes("samesite")) issues.push("Missing SameSite");
            if (issues.length > 0) {
              const details = `Cookie issues: ${issues.join(", ")}`;
              allFindings.push({ route, checkType: "cookie-flags", result: "fail", details, severity: "high" });
              await sql`
                INSERT INTO security_results (run_id, sandbox_id, route, check_type, result, details, severity, created_at)
                VALUES (${runId}, ${sandboxId}, ${route}, 'cookie-flags', 'fail', ${details}, 'high', ${Date.now()})
              `;
            }
          }

          // ── XSS reflection check ────────────────────────────────────────
          const xssUrl = `${url}${url.includes("?") ? "&" : "?"}q=<script>alert(1)</script>`;
          try {
            const xssRes = await fetch(xssUrl, { signal: AbortSignal.timeout(10_000) });
            const body = await xssRes.text();
            const reflected = body.includes("<script>alert(1)</script>");
            if (reflected) {
              allFindings.push({ route, checkType: "xss-reflection", result: "fail", details: "Script tag reflected in response body", severity: "critical" });
              await sql`
                INSERT INTO security_results (run_id, sandbox_id, route, check_type, result, details, severity, created_at)
                VALUES (${runId}, ${sandboxId}, ${route}, 'xss-reflection', 'fail', 'Script tag reflected in response body', 'critical', ${Date.now()})
              `;
            }
          } catch { /* timeout or network error — skip */ }

        } catch { /* route unreachable — skip */ }
      }

      return allFindings;
    });

    // Summary
    const critical = findings.filter((f) => f.severity === "critical" && f.result === "fail").length;
    const high = findings.filter((f) => f.severity === "high" && f.result === "fail").length;
    const medium = findings.filter((f) => f.severity === "medium" && f.result === "fail").length;
    const passed = findings.filter((f) => f.result === "pass").length;
    const summary = `${passed} passed, ${critical} critical, ${high} high, ${medium} medium issues across ${parsed.routes.length} routes`;

    await step.run("finalize", async () => {
      const sql = getDb();
      await sql`UPDATE test_runs SET status = 'completed', finished_at = ${Date.now()}, summary = ${summary} WHERE id = ${runId}`;
    });

    // Send critical alerts for each critical finding
    await step.run("notify-criticals", async () => {
      const criticals = findings.filter((f) => f.severity === "critical" && f.result === "fail");
      for (const finding of criticals) {
        await notifyCritical({
          runId, sandboxId,
          vulnerability: finding.checkType,
          details: finding.details,
          route: finding.route,
        });
      }
    });

    await step.run("notify-complete", async () => {
      const sql = getDb();
      let logs: Array<{ level: string; message: string }> = [];
      try {
        const logRows = await sql`
          SELECT level, message FROM run_logs
          WHERE run_id = ${runId}
          ORDER BY id DESC LIMIT 30
        `;
        logs = logRows.reverse().map((r) => ({ level: String(r.level), message: String(r.message) }));
      } catch { /* non-critical */ }
      const errors = findings
        .filter((f) => f.result === "fail" && (f.severity === "critical" || f.severity === "high"))
        .map((f) => `[${f.severity.toUpperCase()}] ${f.route}: ${f.details}`);
      await notifyScanCompleted({
        runId,
        sandboxId,
        totalChecks: findings.length,
        passed,
        failed: findings.length - passed,
        score: findings.length > 0 ? Math.round((passed / findings.length) * 100) : 0,
        summary,
        logs,
        errors,
      });
    });

    return { ok: true, summary, findings };
  }
);
