/**
 * Scanner: SQL Injection — tests API endpoints with SQLi payloads.
 *
 * Detection signals:
 *  - SQL error strings leaked in response body
 *  - Time-based detection (SLEEP/WAITFOR responses > 4s)
 *  - HTTP 500 on injected input (possible unhandled DB error)
 */

import { httpRequest, type HttpResponse } from "../utils/http-client";
import sqlPayloads from "../payloads/sql.json";

const SQL_ERROR_PATTERNS = [
  "sql syntax",
  "mysql_fetch",
  "pg_query",
  "sqlite3",
  "unclosed quotation",
  "quoted string not properly terminated",
  "you have an error in your sql",
  "syntax error at or near",
  "ora-01756",
  "microsoft ole db",
  "odbc sql server driver",
  "postgresql",
  "warning: mysql",
  "sqlstate",
];

export interface InjectionFinding {
  route: string;
  payload: string;
  evidence: string;
  severity: "critical" | "high" | "medium";
  checkType: string;
}

/**
 * Test a single API endpoint for SQL injection.
 */
export async function scanInjection(
  baseUrl: string,
  route: string,
  method: string = "POST"
): Promise<InjectionFinding[]> {
  const findings: InjectionFinding[] = [];
  const url = `${baseUrl}${route}`;

  for (const payload of sqlPayloads) {
    // Test in JSON body
    let res: HttpResponse;
    if (method === "GET") {
      const sep = url.includes("?") ? "&" : "?";
      res = await httpRequest(`${url}${sep}q=${encodeURIComponent(payload)}`);
    } else {
      res = await httpRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: payload, query: payload, search: payload }),
      });
    }

    // Check for SQL error string leakage
    const bodyLower = res.body.toLowerCase();
    for (const pattern of SQL_ERROR_PATTERNS) {
      if (bodyLower.includes(pattern)) {
        findings.push({
          route,
          payload,
          evidence: `SQL error pattern "${pattern}" found in response`,
          severity: "critical",
          checkType: "sql-injection",
        });
        break;
      }
    }

    // 500 on injected input = suspicious
    if (res.status === 500 && !res.error) {
      findings.push({
        route,
        payload,
        evidence: `Server returned 500 on injected payload`,
        severity: "high",
        checkType: "sql-injection-500",
      });
    }

    // Time-based detection (payload had SLEEP/WAITFOR and response > 4s)
    if (
      (payload.toLowerCase().includes("sleep") || payload.toLowerCase().includes("waitfor")) &&
      res.latency > 4000
    ) {
      findings.push({
        route,
        payload,
        evidence: `Time-based SQLi: response took ${res.latency}ms (expected <4s)`,
        severity: "critical",
        checkType: "sql-injection-time",
      });
    }
  }

  return findings;
}
