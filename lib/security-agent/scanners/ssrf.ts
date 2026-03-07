/**
 * Scanner: SSRF — tests for server-side request forgery.
 *
 * Checks if the endpoint fetches user-supplied URLs,
 * attempting to reach internal metadata endpoints / internal services.
 */

import { httpRequest } from "../utils/http-client";
import ssrfPayloads from "../payloads/ssrf.json";

export interface SsrfFinding {
  route: string;
  payload: string;
  evidence: string;
  severity: "critical" | "high";
  checkType: string;
}

const SSRF_INDICATORS = [
  "ami-id",                       // AWS metadata
  "instance-id",
  "iam",
  "meta-data",
  "access-key",
  "computeMetadata",              // GCP metadata
  "root:x:0",                     // /etc/passwd
  "no-body:x:",
  "+OK",                          // Redis PONG
  "ERR wrong number",
  "STAT pid",                     // Memcached
];

export async function scanSsrf(
  baseUrl: string,
  route: string,
  method: string = "POST"
): Promise<SsrfFinding[]> {
  const findings: SsrfFinding[] = [];
  const url = `${baseUrl}${route}`;

  for (const payload of ssrfPayloads) {
    // Test as JSON body (common for URL-fetching APIs)
    const res = await httpRequest(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: payload, target: payload, link: payload }),
    });

    const bodyLower = res.body.toLowerCase();
    for (const indicator of SSRF_INDICATORS) {
      if (bodyLower.includes(indicator.toLowerCase())) {
        findings.push({
          route,
          payload,
          evidence: `SSRF indicator "${indicator}" found in response`,
          severity: "critical",
          checkType: "ssrf",
        });
        break;
      }
    }

    // Also test via query parameter
    if (method === "GET" || method === "POST") {
      const sep = url.includes("?") ? "&" : "?";
      const getRes = await httpRequest(`${url}${sep}url=${encodeURIComponent(payload)}`);
      const getBodyLower = getRes.body.toLowerCase();
      for (const indicator of SSRF_INDICATORS) {
        if (getBodyLower.includes(indicator.toLowerCase())) {
          findings.push({
            route,
            payload,
            evidence: `SSRF indicator "${indicator}" in query-param response`,
            severity: "critical",
            checkType: "ssrf-query",
          });
          break;
        }
      }
    }
  }

  return findings;
}
