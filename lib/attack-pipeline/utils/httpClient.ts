/**
 * Enhanced HTTP client with cookie jar and session management.
 * Designed for stateful security testing workflows (e.g. login-then-probe).
 */

import { executeSecurityRequest } from "../../utils/securityHttpClient";

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  followRedirects?: boolean;
}

export interface HttpResult {
  status: number;
  headers: Record<string, string>;
  setCookies: string[];
  body: string;
  latency: number;
  redirected: boolean;
  finalUrl: string;
  error?: string;
}

/**
 * Stateless HTTP request — does not maintain session state.
 */
export async function httpRequest(url: string, opts?: RequestOptions): Promise<HttpResult> {
  return executeSecurityRequest(
    url,
    {
      method: opts?.method,
      headers: opts?.headers,
      body: opts?.body,
      timeoutMs: opts?.timeoutMs,
      redirect: opts?.followRedirects === false ? "manual" : "follow",
    },
    20_000
  );
}
