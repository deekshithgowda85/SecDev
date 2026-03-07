/**
 * Scanner: Security Headers — checks HTTP response headers for OWASP recommendations.
 */

import { httpRequest } from "../utils/http-client";

export interface HeaderFinding {
  route: string;
  header: string;
  result: "pass" | "fail";
  details: string;
  severity: "info" | "low" | "medium" | "high";
  checkType: string;
}

const REQUIRED_HEADERS: Array<{ header: string; label: string; severity: "high" | "medium" | "low" }> = [
  { header: "content-security-policy", label: "CSP", severity: "high" },
  { header: "x-frame-options", label: "X-Frame-Options", severity: "medium" },
  { header: "strict-transport-security", label: "HSTS", severity: "high" },
  { header: "x-content-type-options", label: "X-Content-Type-Options", severity: "medium" },
  { header: "referrer-policy", label: "Referrer-Policy", severity: "low" },
  { header: "permissions-policy", label: "Permissions-Policy", severity: "low" },
];

const LEAKY_HEADERS = ["server", "x-powered-by", "x-aspnet-version", "x-aspnetmvc-version"];

export async function scanHeaders(
  baseUrl: string,
  route: string
): Promise<HeaderFinding[]> {
  const findings: HeaderFinding[] = [];
  const url = `${baseUrl}${route}`;
  const res = await httpRequest(url);

  // Check required security headers
  for (const { header, label, severity } of REQUIRED_HEADERS) {
    const value = res.headers[header];
    findings.push({
      route,
      header: label,
      result: value ? "pass" : "fail",
      details: value ? `${label}: ${value}` : `Missing ${label} header`,
      severity: value ? "info" : severity,
      checkType: `header-${header}`,
    });
  }

  // Check for information disclosure headers
  for (const header of LEAKY_HEADERS) {
    const value = res.headers[header];
    if (value) {
      findings.push({
        route,
        header,
        result: "fail",
        details: `Information disclosure: ${header}: ${value}`,
        severity: "medium",
        checkType: "info-disclosure",
      });
    }
  }

  // Cookie security flags
  const setCookie = res.headers["set-cookie"];
  if (setCookie) {
    const lc = setCookie.toLowerCase();
    const issues: string[] = [];
    if (!lc.includes("httponly")) issues.push("Missing HttpOnly");
    if (!lc.includes("secure")) issues.push("Missing Secure");
    if (!lc.includes("samesite")) issues.push("Missing SameSite");
    if (issues.length > 0) {
      findings.push({
        route,
        header: "Set-Cookie",
        result: "fail",
        details: `Cookie issues: ${issues.join(", ")}`,
        severity: "high",
        checkType: "cookie-flags",
      });
    }
  }

  // CORS misconfiguration check
  const acao = res.headers["access-control-allow-origin"];
  if (acao === "*") {
    findings.push({
      route,
      header: "CORS",
      result: "fail",
      details: "CORS allows any origin (Access-Control-Allow-Origin: *)",
      severity: "medium",
      checkType: "cors-wildcard",
    });
  }

  return findings;
}
