/**
 * Orchestrator Agent — coordinates all attack agents across discovered routes.
 *
 * Route categorization → agent assignment → parallel execution (batch=4).
 *
 * Login/register routes: SQLi + auth-bypass + injection + parameter agents
 * General API routes:    auth-bypass + injection + parameter agents
 * Pages:                 headers-only check
 */

import type { DiscoveredRoute } from "../parsers/routeParser";
import { runSqlInjection, type SqlFinding } from "./sqlInjectionAgent";
import { runAuthBypass, type AuthFinding } from "./authBypassAgent";
import { runInjection, type InjectionFinding } from "./injectionAgent";
import { runParameterTests, type ParameterFinding } from "./parameterAgent";
import { httpRequest } from "../utils/httpClient";

export type AgentName = "sql-injection" | "auth-bypass" | "injection" | "parameter" | "headers";

export interface AgentTask {
  id: string;
  route: string;
  agents: AgentName[];
  priority: number;
}

export interface UnifiedFinding {
  id: string;
  route: string;
  agent: AgentName;
  checkType: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  result: "pass" | "fail";
  details: string;
  payload?: string;
  curlReplay?: string;
  remediation?: string;
}

export interface OrchestrationReport {
  tasks: AgentTask[];
  findings: UnifiedFinding[];
  routeCount: number;
  agentRunCount: number;
}

// Remediation guidance keyed by checkType
const REMEDIATION: Record<string, string> = {
  "sql-injection-error": "Use parameterized queries / prepared statements. Never concatenate user input into SQL strings.",
  "sql-injection-500":   "Use parameterized queries. Hide raw DB errors from clients in production.",
  "sql-injection-time":  "Use parameterized queries. Apply WAF rules to block SLEEP/WAITFOR/pg_sleep patterns.",
  "sql-injection-boolean": "Use parameterized queries and return consistent responses regardless of data matches.",
  "sql-injection-boolean-size": "Use parameterized queries. Normalize response sizes for auth endpoints.",
  "sql-injection-union": "Use parameterized queries. Disable detailed error messages in production.",
  "auth-bypass-jwt":     "Validate JWT signature on every request. Reject tokens with alg=none. Use strong HMAC secrets.",
  "default-credentials": "Remove all default credentials. Enforce strong password policy. Add brute-force lockout.",
  "mass-assignment":     "Whitelist allowed request body fields. Use allowlist validation, not a blocklist.",
  "forced-browsing":     "Implement authentication middleware on ALL protected routes. Return 401/403 for unauthenticated access.",
  "command-injection":   "Never pass user input to shell commands. Use execFile() with argument arrays, not shell strings.",
  "command-injection-get": "Never pass user input to shell commands. Sanitize all query parameters.",
  "ssti":                "Use safe template engines. Sanitize user input before rendering in templates.",
  "ssti-body":           "Use safe template engines. Sanitize user input before rendering in templates.",
  "path-traversal":      "Validate and sanitize file paths. Use a whitelist of allowed directories. Reject '..' sequences.",
  "header-injection-crlf": "Sanitize redirect/redirect_uri params. Strip \\r and \\n characters from user input.",
  "privilege-escalation-query": "Never trust client-supplied role/privilege parameters. Derive privileges server-side only.",
  "privilege-escalation-body":  "Ignore/reject privilege-related fields from client requests. Whitelist allowed body fields.",
  "http-param-pollution": "Parse query strings consistently. Reject duplicate parameter names or use first-wins logic.",
  "type-confusion-500":  "Validate and type-check all input fields. Return 400 for invalid types, not 500.",
  "type-confusion-auth": "Enforce strict type validation. Never authenticate on type-coerced values.",
  "prototype-pollution": "Use Object.create(null) for parsed JSON. Validate and sanitize __proto__ and constructor keys.",
  "header-missing":      "Add recommended security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options.",
  "info-disclosure":     "Remove or mask technology-revealing headers (X-Powered-By, Server, X-AspNet-Version).",
};

const REQUIRED_SECURITY_HEADERS = [
  { key: "content-security-policy",   label: "CSP",                  severity: "high"   as const },
  { key: "strict-transport-security", label: "HSTS",                  severity: "high"   as const },
  { key: "x-frame-options",           label: "X-Frame-Options",       severity: "medium" as const },
  { key: "x-content-type-options",    label: "X-Content-Type-Options", severity: "medium" as const },
  { key: "referrer-policy",           label: "Referrer-Policy",       severity: "low"    as const },
  { key: "permissions-policy",        label: "Permissions-Policy",    severity: "low"    as const },
];

const LEAKY_HEADERS = ["x-powered-by", "server", "x-aspnet-version", "x-aspnetmvc-version"];

function assignAgents(route: DiscoveredRoute): AgentName[] {
  const agents: AgentName[] = ["headers"];
  if (route.type === "page") return agents; // pages: header check only

  agents.push("auth-bypass", "injection", "parameter");

  // Auth routes deserve the full SQLi treatment first (highest priority)
  if (
    route.category === "login" ||
    route.category === "register" ||
    route.category === "auth"
  ) {
    agents.unshift("sql-injection");
  }
  return agents;
}

async function checkSecurityHeaders(baseUrl: string, route: string): Promise<UnifiedFinding[]> {
  const findings: UnifiedFinding[] = [];
  const url = `${baseUrl}${route}`;
  const res = await httpRequest(url, { timeoutMs: 8_000 });

  for (const { key, label, severity } of REQUIRED_SECURITY_HEADERS) {
    const present = !!res.headers[key];
    findings.push({
      id: `header-${key}-${route.replace(/\//g, "-")}`,
      route,
      agent: "headers",
      checkType: present ? `header-present` : "header-missing",
      severity: present ? "info" : severity,
      result: present ? "pass" : "fail",
      details: present ? `${label} header present` : `Missing ${label} security header`,
      remediation: REMEDIATION["header-missing"],
    });
  }

  for (const key of LEAKY_HEADERS) {
    if (res.headers[key]) {
      findings.push({
        id: `leaky-${key}-${route.replace(/\//g, "-")}`,
        route,
        agent: "headers",
        checkType: "info-disclosure",
        severity: "medium",
        result: "fail",
        details: `Information disclosure via header "${key}: ${res.headers[key]}"`,
        remediation: REMEDIATION["info-disclosure"],
      });
    }
  }
  return findings;
}

function toUnified<
  T extends {
    route: string;
    checkType: string;
    severity: "critical" | "high" | "medium";
    evidence?: string;
    payload?: string;
    curlReplay?: string;
  }
>(items: T[], agent: AgentName): UnifiedFinding[] {
  return items.map((f, i) => ({
    id: `${agent}-${f.checkType}-${i}-${f.route.replace(/\//g, "-")}`,
    route: f.route,
    agent,
    checkType: f.checkType,
    severity: f.severity,
    result: "fail" as const,
    details: f.evidence ?? f.checkType,
    payload: f.payload,
    curlReplay: f.curlReplay,
    remediation: REMEDIATION[f.checkType] ?? `Remediate ${f.checkType} vulnerability.`,
  }));
}

/** Build task manifest for planning/display purposes. */
export function buildTaskManifest(routes: DiscoveredRoute[]): AgentTask[] {
  return routes.map((route, i) => ({
    id: `task-${i}-${route.path.replace(/\//g, "-")}`,
    route: route.path,
    agents: assignAgents(route),
    priority: route.priority,
  }));
}

/** Run all assigned agents for all routes in batches of 4. */
export async function orchestrate(
  baseUrl: string,
  routes: DiscoveredRoute[],
  onProgress?: (msg: string) => void
): Promise<OrchestrationReport> {
  const tasks = buildTaskManifest(routes);
  const allFindings: UnifiedFinding[] = [];
  let agentRunCount = 0;

  const BATCH = 4;
  for (let i = 0; i < routes.length; i += BATCH) {
    const batch = routes.slice(i, i + BATCH);

    const batchResults = await Promise.all(
      batch.map(async (route) => {
        const agents = assignAgents(route);
        onProgress?.(`[${route.path}] Agents: ${agents.join(", ")}`);

        const findings: UnifiedFinding[] = [];

        // Security headers — every route
        const headerFindings = await checkSecurityHeaders(baseUrl, route.path);
        findings.push(...headerFindings);
        agentRunCount++;

        // API-specific agents
        if (route.type === "api") {
          const [sqlFs, authFs, injFs, paramFs] = await Promise.all([
            agents.includes("sql-injection")
              ? runSqlInjection(baseUrl, route).then((r: SqlFinding[]) => toUnified(r, "sql-injection"))
              : Promise.resolve([] as UnifiedFinding[]),
            agents.includes("auth-bypass")
              ? runAuthBypass(baseUrl, route).then((r: AuthFinding[]) => toUnified(r, "auth-bypass"))
              : Promise.resolve([] as UnifiedFinding[]),
            agents.includes("injection")
              ? runInjection(baseUrl, route).then((r: InjectionFinding[]) => toUnified(r, "injection"))
              : Promise.resolve([] as UnifiedFinding[]),
            agents.includes("parameter")
              ? runParameterTests(baseUrl, route).then((r: ParameterFinding[]) => toUnified(r, "parameter"))
              : Promise.resolve([] as UnifiedFinding[]),
          ]);

          findings.push(...sqlFs, ...authFs, ...injFs, ...paramFs);
          agentRunCount += agents.filter((a) => a !== "headers").length;
        }

        return findings;
      })
    );

    for (const findings of batchResults) allFindings.push(...findings);
  }

  return {
    tasks,
    findings: allFindings,
    routeCount: routes.length,
    agentRunCount,
  };
}
