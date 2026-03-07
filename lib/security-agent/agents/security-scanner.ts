/**
 * Security Scanner Agent — executes all security scans for a single route.
 *
 * Runs: injection, XSS, SSRF, auth-bypass, headers, rate-limit scanners
 * against the given route and returns unified findings.
 */

import type { ScanType } from "./test-planner";
import type { DiscoveredRoute } from "./route-discovery";
import { scanInjection } from "../scanners/injection";
import { scanXss } from "../scanners/xss";
import { scanSsrf } from "../scanners/ssrf";
import { scanAuth } from "../scanners/auth";
import { scanHeaders } from "../scanners/headers";
import { scanRateLimit } from "../scanners/rate-limit";

export interface UnifiedFinding {
  route: string;
  checkType: string;
  result: "pass" | "fail";
  severity: "critical" | "high" | "medium" | "low" | "info";
  details: string;
  payload?: string;
}

export async function runSecurityScans(
  baseUrl: string,
  route: DiscoveredRoute,
  scans: ScanType[]
): Promise<UnifiedFinding[]> {
  const findings: UnifiedFinding[] = [];
  const primaryMethod = route.methods.includes("POST") ? "POST" : route.methods[0] ?? "GET";

  for (const scan of scans) {
    switch (scan) {
      case "sql-injection": {
        const results = await scanInjection(baseUrl, route.path, primaryMethod);
        if (results.length === 0) {
          findings.push({ route: route.path, checkType: "sql-injection", result: "pass", severity: "info", details: "No SQL injection detected" });
        }
        for (const r of results) {
          findings.push({ route: r.route, checkType: r.checkType, result: "fail", severity: r.severity, details: r.evidence, payload: r.payload });
        }
        break;
      }
      case "xss": {
        const results = await scanXss(baseUrl, route.path);
        if (results.length === 0) {
          findings.push({ route: route.path, checkType: "xss", result: "pass", severity: "info", details: "No XSS reflection detected" });
        }
        for (const r of results) {
          findings.push({ route: r.route, checkType: r.checkType, result: "fail", severity: r.severity, details: r.evidence, payload: r.payload });
        }
        break;
      }
      case "ssrf": {
        const results = await scanSsrf(baseUrl, route.path, primaryMethod);
        if (results.length === 0) {
          findings.push({ route: route.path, checkType: "ssrf", result: "pass", severity: "info", details: "No SSRF detected" });
        }
        for (const r of results) {
          findings.push({ route: r.route, checkType: r.checkType, result: "fail", severity: r.severity, details: r.evidence, payload: r.payload });
        }
        break;
      }
      case "auth-bypass": {
        const results = await scanAuth(baseUrl, route.path, primaryMethod);
        if (results.length === 0) {
          findings.push({ route: route.path, checkType: "auth-bypass", result: "pass", severity: "info", details: "Auth checks appear intact" });
        }
        for (const r of results) {
          findings.push({ route: r.route, checkType: r.checkType, result: "fail", severity: r.severity, details: r.evidence });
        }
        break;
      }
      case "headers": {
        const results = await scanHeaders(baseUrl, route.path);
        for (const r of results) {
          findings.push({ route: r.route, checkType: r.checkType, result: r.result, severity: r.severity, details: r.details });
        }
        break;
      }
      case "rate-limit": {
        const results = await scanRateLimit(baseUrl, route.path);
        for (const r of results) {
          findings.push({ route: r.route, checkType: r.checkType, result: r.result, severity: r.severity, details: r.details });
        }
        break;
      }
    }
  }

  return findings;
}
