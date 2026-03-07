/**
 * Input Injection Agent — tests endpoints for OS command injection,
 * server-side template injection (SSTI), path traversal, and CRLF header injection.
 *
 * All detection is deterministic (no AI).
 */

import { httpRequest } from "../utils/httpClient";
import { CMD_PAYLOADS, SCRIPT_PAYLOADS, PATH_PAYLOADS } from "../utils/payloadGenerator";

export interface InjectionFinding {
  route: string;
  attackType: "command" | "ssti" | "path-traversal" | "header-injection";
  payload: string;
  evidence: string;
  severity: "critical" | "high" | "medium";
  checkType: string;
  curlReplay: string;
}

const CMD_SUCCESS_INDICATORS = [
  "root:",
  "bin/bash",
  "bin/sh",
  "uid=",
  "gid=",
  "/home/",
  "/etc/passwd",
  "total ",           // ls -la output
  "Directory of",     // Windows dir
  "Volume in drive",
];

const SSTI_INDICATORS = [
  "49",   // {{7*7}} evaluated (most engines)
  "7s7",  // Twig: {{7*'7'}}
  "343",  // 7**3 (Python Mako)
];

const PATH_TRAVERSAL_INDICATORS = [
  "root:x:0:0",      // /etc/passwd
  "bin:x:",
  "[boot loader]",   // windows/boot.ini
  "[operating systems]",
  "for 16-bit app",
  "/proc/self",
];

const CRLF_PAYLOADS = [
  "foo\r\nX-Injected: injected",
  "foo%0d%0aX-Injected: injected",
  "foo%0aX-Injected: injected",
  "foo\r\nSet-Cookie: injected=1",
];

// Common API input field names to inject into
const INJECTION_FIELDS = ["input", "cmd", "command", "exec", "run", "query", "search", "q", "name", "value", "param"];

// ── Command Injection ─────────────────────────────────────────────────────────
async function testCommandInjection(
  baseUrl: string,
  route: string,
  method: string
): Promise<InjectionFinding[]> {
  const findings: InjectionFinding[] = [];
  const url = `${baseUrl}${route}`;

  for (const payload of CMD_PAYLOADS) {
    // Limit field permutations to keep scan fast
    for (const field of INJECTION_FIELDS.slice(0, 5)) {
      // POST body injection
      const body = { [field]: payload };
      const postRes = await httpRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        timeoutMs: 8_000,
      });

      for (const indicator of CMD_SUCCESS_INDICATORS) {
        if (postRes.body.includes(indicator)) {
          findings.push({
            route,
            attackType: "command",
            payload,
            evidence: `Command output indicator "${indicator}" found in response body`,
            severity: "critical",
            checkType: "command-injection",
            curlReplay: `curl -s -X ${method} "${url}" -H "Content-Type: application/json" -d '{"${field}":"${payload.replace(/'/g, "\\'")}"}'`,
          });
          break;
        }
      }

      // GET query param injection
      const sep = url.includes("?") ? "&" : "?";
      const getRes = await httpRequest(`${url}${sep}${field}=${encodeURIComponent(payload)}`, { timeoutMs: 8_000 });
      for (const indicator of CMD_SUCCESS_INDICATORS) {
        if (getRes.body.includes(indicator)) {
          findings.push({
            route,
            attackType: "command",
            payload,
            evidence: `Command output indicator "${indicator}" in response (query param injection)`,
            severity: "critical",
            checkType: "command-injection-get",
            curlReplay: `curl -s "${url}${sep}${field}=${encodeURIComponent(payload)}"`,
          });
          break;
        }
      }
    }
  }
  return findings;
}

// ── SSTI ──────────────────────────────────────────────────────────────────────
async function testSsti(
  baseUrl: string,
  route: string,
  method: string
): Promise<InjectionFinding[]> {
  const findings: InjectionFinding[] = [];
  const url = `${baseUrl}${route}`;

  const sstiPayloads = SCRIPT_PAYLOADS.filter(
    (p) => p.includes("{{") || p.includes("${") || p.includes("<%") || p.includes("#{")
  );

  for (const payload of sstiPayloads) {
    // Query-param injection (GET)
    const sep = url.includes("?") ? "&" : "?";
    const getRes = await httpRequest(`${url}${sep}q=${encodeURIComponent(payload)}`, { timeoutMs: 8_000 });
    for (const indicator of SSTI_INDICATORS) {
      if (getRes.body.includes(indicator)) {
        findings.push({
          route,
          attackType: "ssti",
          payload,
          evidence: `SSTI: template expression evaluated — found "${indicator}" via query param`,
          severity: "critical",
          checkType: "ssti",
          curlReplay: `curl -s "${url}${sep}q=${encodeURIComponent(payload)}"`,
        });
        break;
      }
    }

    // POST body injection
    const bodyRes = await httpRequest(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: payload, template: payload, value: payload }),
      timeoutMs: 8_000,
    });
    for (const indicator of SSTI_INDICATORS) {
      if (bodyRes.body.includes(indicator)) {
        findings.push({
          route,
          attackType: "ssti",
          payload,
          evidence: `SSTI (body): template expression evaluated — found "${indicator}"`,
          severity: "critical",
          checkType: "ssti-body",
          curlReplay: `curl -s -X ${method} "${url}" -H "Content-Type: application/json" -d '${JSON.stringify({ input: payload })}'`,
        });
        break;
      }
    }
  }
  return findings;
}

// ── Path Traversal ────────────────────────────────────────────────────────────
async function testPathTraversal(baseUrl: string, route: string): Promise<InjectionFinding[]> {
  const findings: InjectionFinding[] = [];
  const url = `${baseUrl}${route}`;

  for (const payload of PATH_PAYLOADS) {
    const sep = url.includes("?") ? "&" : "?";
    const res = await httpRequest(
      `${url}${sep}file=${encodeURIComponent(payload)}&path=${encodeURIComponent(payload)}`,
      { timeoutMs: 8_000 }
    );
    for (const indicator of PATH_TRAVERSAL_INDICATORS) {
      if (res.body.includes(indicator)) {
        findings.push({
          route,
          attackType: "path-traversal",
          payload,
          evidence: `Path traversal: file content leakage "${indicator}" in response`,
          severity: "critical",
          checkType: "path-traversal",
          curlReplay: `curl -s "${url}${sep}file=${encodeURIComponent(payload)}"`,
        });
        break;
      }
    }
  }
  return findings;
}

// ── CRLF / Header Injection ───────────────────────────────────────────────────
async function testHeaderInjection(baseUrl: string, route: string): Promise<InjectionFinding[]> {
  const findings: InjectionFinding[] = [];
  const url = `${baseUrl}${route}`;

  for (const payload of CRLF_PAYLOADS) {
    const sep = url.includes("?") ? "&" : "?";
    const res = await httpRequest(`${url}${sep}redirect=${encodeURIComponent(payload)}`, {
      followRedirects: false,
      timeoutMs: 8_000,
    });

    if (res.headers["x-injected"] || res.headers["set-cookie"]?.includes("injected=1")) {
      findings.push({
        route,
        attackType: "header-injection",
        payload,
        evidence: "CRLF injection: injected header reflected in HTTP response",
        severity: "high",
        checkType: "header-injection-crlf",
        curlReplay: `curl -sv "${url}${sep}redirect=${encodeURIComponent(payload)}"`,
      });
    }
  }
  return findings;
}

/** Create injection task definitions for a list of routes. */
export function createInjectionTasks(routes: Array<{ path: string; methods: string[] }>) {
  return routes.map((route) => ({
    id: `injection-${route.path.replace(/\//g, "-")}`,
    route: route.path,
    method: route.methods.includes("POST") ? "POST" : "GET",
    attackTypes: ["command", "ssti", "path-traversal", "header-injection"] as const,
  }));
}

/** Execute all injection tests against a single route. */
export async function runInjection(
  baseUrl: string,
  route: { path: string; methods: string[] }
): Promise<InjectionFinding[]> {
  const method = route.methods.includes("POST") ? "POST" : "GET";
  const [cmdFindings, sstiFindings, pathFindings, headerFindings] = await Promise.all([
    testCommandInjection(baseUrl, route.path, method),
    testSsti(baseUrl, route.path, method),
    testPathTraversal(baseUrl, route.path),
    testHeaderInjection(baseUrl, route.path),
  ]);
  return [...cmdFindings, ...sstiFindings, ...pathFindings, ...headerFindings];
}
