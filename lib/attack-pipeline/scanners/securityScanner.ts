/**
 * Security Scanner — runs all attack agents + vibetest + API validation.
 * Returns a unified SecurityScanResult scored 0–100.
 */

import type { DiscoveredRoute } from "../parsers/routeParser";
import { orchestrate, type UnifiedFinding } from "../agents/orchestrator";
import { httpRequest } from "../utils/httpClient";
import { FUZZ_PAYLOADS } from "../utils/payloadGenerator";

export interface VibeTestFinding {
  route: string;
  testCase: string;
  payload: string;
  statusCode: number;
  evidence: string;
  severity: "medium" | "low";
  checkType: string;
}

export interface ApiValidationResult {
  route: string;
  method: string;
  statusCode: number;
  isJson: boolean;
  responseTime: number;
  status: "pass" | "fail" | "error";
  details: string;
}

export interface SecurityScanResult {
  baseUrl: string;
  totalRoutes: number;
  findings: UnifiedFinding[];
  vibeFindings: VibeTestFinding[];
  apiResults: ApiValidationResult[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  passCount: number;
  overallScore: number;
  duration: number;
}

// ── Vibetest ──────────────────────────────────────────────────────────────────
// Robustness testing with null/large/unicode/malformed inputs.
async function runVibetest(baseUrl: string, route: DiscoveredRoute): Promise<VibeTestFinding[]> {
  const findings: VibeTestFinding[] = [];
  const url = `${baseUrl}${route.path}`;
  const method = route.methods.includes("POST") ? "POST" : "GET";

  for (const payload of FUZZ_PAYLOADS) {
    const payloadStr = String(payload);
    // Skip very large payloads on GET routes (no body)
    if (payloadStr.length > 1000 && method === "GET") continue;

    const body = JSON.stringify({ input: payloadStr.slice(0, 5000), data: payloadStr.slice(0, 5000) });

    const res = await httpRequest(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? body : undefined,
      timeoutMs: 8_000,
    });

    if (res.status === 500) {
      findings.push({
        route: route.path,
        testCase: "fuzz-crash",
        payload: payloadStr.slice(0, 120),
        statusCode: 500,
        evidence: "Server returned 500 on fuzz input — unhandled error path detected",
        severity: "medium",
        checkType: "vibetest-500",
      });
      break; // One crash finding per route is enough
    }
  }

  // Check whether the server accepts malformed JSON (should return 400)
  if (method === "POST") {
    const malformed = `{"key": }`;
    const malRes = await httpRequest(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: malformed,
      timeoutMs: 5_000,
    });
    if (malRes.status === 200) {
      findings.push({
        route: route.path,
        testCase: "malformed-json-accepted",
        payload: malformed,
        statusCode: 200,
        evidence: "Server accepted malformed JSON with 200 — missing body validation middleware",
        severity: "medium",
        checkType: "vibetest-malformed-json",
      });
    }
  }

  return findings;
}

// ── API Validation ────────────────────────────────────────────────────────────
// Basic smoke test: status code, JSON validity, response time.
async function validateApi(baseUrl: string, route: DiscoveredRoute): Promise<ApiValidationResult[]> {
  const results: ApiValidationResult[] = [];
  const url = `${baseUrl}${route.path}`;

  for (const method of route.methods.slice(0, 3)) {
    const body = method !== "GET" && method !== "DELETE" ? JSON.stringify({}) : undefined;

    const res = await httpRequest(url, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
      timeoutMs: 10_000,
    });

    let isJson = false;
    try {
      JSON.parse(res.body);
      isJson = true;
    } catch { /* not JSON */ }

    const status: ApiValidationResult["status"] = res.error
      ? "error"
      : res.status >= 200 && res.status < 500
      ? "pass"
      : "fail";

    results.push({
      route: route.path,
      method,
      statusCode: res.status,
      isJson,
      responseTime: res.latency,
      status,
      details: res.error ?? (isJson ? "Valid JSON response" : "Non-JSON or empty response"),
    });
  }
  return results;
}

// ── Score calculation ─────────────────────────────────────────────────────────
function calculateScore(findings: UnifiedFinding[]): number {
  const failed = findings.filter((f) => f.result === "fail");
  const critical = failed.filter((f) => f.severity === "critical").length;
  const high     = failed.filter((f) => f.severity === "high").length;
  const medium   = failed.filter((f) => f.severity === "medium").length;
  const low      = failed.filter((f) => f.severity === "low").length;
  return Math.max(0, Math.min(100, 100 - critical * 15 - high * 8 - medium * 3 - low));
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function runSecurityScan(
  baseUrl: string,
  routes: DiscoveredRoute[],
  onProgress?: (msg: string) => void
): Promise<SecurityScanResult> {
  const start = Date.now();
  onProgress?.(`Security scan starting — ${routes.length} routes`);

  const apiRoutes = routes.filter((r) => r.type === "api");

  // Run all three subsystems in parallel
  const [orchestration, vibeResults, apiResults] = await Promise.all([
    orchestrate(baseUrl, routes, onProgress),
    Promise.all(apiRoutes.map((r) => runVibetest(baseUrl, r))).then((a) => a.flat()),
    Promise.all(apiRoutes.map((r) => validateApi(baseUrl, r))).then((a) => a.flat()),
  ]);

  const { findings } = orchestration;
  const failed = findings.filter((f) => f.result === "fail");

  const criticalCount = failed.filter((f) => f.severity === "critical").length;
  const highCount     = failed.filter((f) => f.severity === "high").length;
  const mediumCount   = failed.filter((f) => f.severity === "medium").length;
  const lowCount      = failed.filter((f) => f.severity === "low").length;
  const passCount     = findings.filter((f) => f.result === "pass").length;
  const overallScore  = calculateScore(findings);

  onProgress?.(`Scan complete — score ${overallScore}/100 (${criticalCount} critical, ${highCount} high)`);

  return {
    baseUrl,
    totalRoutes: routes.length,
    findings,
    vibeFindings: vibeResults,
    apiResults,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    passCount,
    overallScore,
    duration: Date.now() - start,
  };
}
