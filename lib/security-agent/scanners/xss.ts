/**
 * Scanner: XSS — tests for reflected cross-site scripting.
 *
 * Detection:
 *  - Payload reflected unescaped in response body
 *  - Script/event handler tags present in reflected output
 */

import { httpRequest } from "../utils/http-client";
import xssPayloads from "../payloads/xss.json";

export interface XssFinding {
  route: string;
  payload: string;
  evidence: string;
  severity: "critical" | "high";
  checkType: string;
}

export async function scanXss(
  baseUrl: string,
  route: string
): Promise<XssFinding[]> {
  const findings: XssFinding[] = [];
  const url = `${baseUrl}${route}`;

  for (const payload of xssPayloads) {
    // Inject via query parameter
    const sep = url.includes("?") ? "&" : "?";
    const res = await httpRequest(`${url}${sep}q=${encodeURIComponent(payload)}`);

    if (res.body.includes(payload)) {
      findings.push({
        route,
        payload,
        evidence: "XSS payload reflected unescaped in response",
        severity: "critical",
        checkType: "xss-reflected",
      });
    }

    // Also inject via POST body
    const postRes = await httpRequest(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: payload }),
    });

    if (postRes.body.includes(payload)) {
      findings.push({
        route,
        payload,
        evidence: "XSS payload reflected in POST response body",
        severity: "critical",
        checkType: "xss-reflected-post",
      });
    }
  }

  return findings;
}
