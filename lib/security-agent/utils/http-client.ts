/**
 * HTTP client utility for security testing — wraps fetch with timeouts,
 * response metadata capture, and safe error handling.
 */

import { executeSecurityRequest } from "../../utils/securityHttpClient";

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  latency: number;
  error?: string;
}

/**
 * Fire a single HTTP request and capture full response metadata.
 */
export async function httpRequest(
  url: string,
  opts?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    redirect?: RequestRedirect;
  }
): Promise<HttpResponse> {
  const baseRes = await executeSecurityRequest(
    url,
    {
      method: opts?.method,
      headers: opts?.headers,
      body: opts?.body,
      timeoutMs: opts?.timeoutMs,
      redirect: opts?.redirect ?? "manual",
    },
    10_000
  );

  const result: HttpResponse = {
    status: baseRes.status,
    headers: baseRes.headers,
    body: baseRes.body,
    latency: baseRes.latency,
  };
  if (baseRes.error !== undefined) {
    result.error = baseRes.error;
  }
  return result;
}
