/**
 * Scanner: Rate Limiting — detects if endpoints have rate limiting.
 *
 * Sends rapid bursts of requests and checks if the server throttles.
 */

import { httpRequest } from "../utils/http-client";

export interface RateLimitFinding {
  route: string;
  result: "pass" | "fail";
  details: string;
  severity: "medium" | "info";
  checkType: string;
}

const BURST_SIZE = 30;

export async function scanRateLimit(
  baseUrl: string,
  route: string
): Promise<RateLimitFinding[]> {
  const url = `${baseUrl}${route}`;
  let got429 = false;
  let gotRetryAfter = false;

  // Send rapid-fire burst
  const promises = Array.from({ length: BURST_SIZE }, () =>
    httpRequest(url, { timeoutMs: 10_000 })
  );
  const results = await Promise.all(promises);

  for (const res of results) {
    if (res.status === 429) got429 = true;
    if (res.headers["retry-after"]) gotRetryAfter = true;
  }

  const findings: RateLimitFinding[] = [];

  if (!got429) {
    findings.push({
      route,
      result: "fail",
      details: `No rate limiting detected after ${BURST_SIZE} rapid requests`,
      severity: "medium",
      checkType: "rate-limit-missing",
    });
  } else {
    findings.push({
      route,
      result: "pass",
      details: `Rate limiting active (429 returned). Retry-After header: ${gotRetryAfter ? "yes" : "no"}`,
      severity: "info",
      checkType: "rate-limit-present",
    });
  }

  return findings;
}
