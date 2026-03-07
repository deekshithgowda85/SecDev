/**
 * Scanner: Auth — tests API endpoints for authentication/authorization bypasses.
 *
 * Checks:
 *  - Unauthenticated access to protected routes
 *  - Invalid/malformed token acceptance
 *  - JWT "none" algorithm bypass
 *  - Default credentials
 */

import { httpRequest } from "../utils/http-client";
import authPayloads from "../payloads/auth.json";

export interface AuthFinding {
  route: string;
  description: string;
  evidence: string;
  severity: "critical" | "high" | "medium";
  checkType: string;
}

export async function scanAuth(
  baseUrl: string,
  route: string,
  method: string = "GET"
): Promise<AuthFinding[]> {
  const findings: AuthFinding[] = [];
  const url = `${baseUrl}${route}`;

  for (const testCase of authPayloads) {
    const merged: Record<string, string> = { "Content-Type": "application/json" };
    for (const [k, v] of Object.entries(testCase.headers)) {
      if (v) merged[k] = v;
    }
    const res = await httpRequest(url, {
      method,
      headers: merged,
    });

    // If endpoint returns 200 with no/invalid auth → possible bypass
    if (res.status >= 200 && res.status < 300) {
      // Skip if endpoint is explicitly public (login, register, health, docs)
      const routeLower = route.toLowerCase();
      if (
        routeLower.includes("login") ||
        routeLower.includes("register") ||
        routeLower.includes("signup") ||
        routeLower.includes("health") ||
        routeLower.includes("docs") ||
        routeLower.includes("public")
      ) {
        continue;
      }

      findings.push({
        route,
        description: testCase.description,
        evidence: `Endpoint returned ${res.status} with: ${testCase.description}`,
        severity: testCase.description.includes("none algorithm") ? "critical" : "high",
        checkType: "auth-bypass",
      });
    }
  }

  return findings;
}
