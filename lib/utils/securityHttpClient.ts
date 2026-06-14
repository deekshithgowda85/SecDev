/**
 * Shared internal implementation for security scanner HTTP execution.
 * DO NOT import this file outside of the HTTP client wrappers.
 */

export interface SharedRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  redirect?: RequestRedirect;
}

export interface SharedResponse {
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
 * Executes a security test request with latency measurement, timeout support,
 * body truncation, and custom error mapping.
 */
export async function executeSecurityRequest(
  url: string,
  opts?: SharedRequestOptions,
  truncateLimit: number = 10_000
): Promise<SharedResponse> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: opts?.method ?? "GET",
      headers: opts?.headers,
      body: opts?.body,
      redirect: opts?.redirect,
      signal: AbortSignal.timeout(opts?.timeoutMs ?? 15_000),
    });

    const body = await res.text().catch(() => "");
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headers[k] = v;
    });

    // Collect all Set-Cookie headers
    const setCookies: string[] = [];
    if (typeof (res.headers as { getSetCookie?: () => string[] }).getSetCookie === "function") {
      setCookies.push(...((res.headers as { getSetCookie: () => string[] }).getSetCookie()));
    } else if (headers["set-cookie"]) {
      setCookies.push(headers["set-cookie"]);
    }

    return {
      status: res.status,
      headers,
      setCookies,
      body: body.slice(0, truncateLimit),
      latency: Date.now() - start,
      redirected: res.redirected,
      finalUrl: res.url || url,
    };
  } catch (err: unknown) {
    return {
      status: 0,
      headers: {},
      setCookies: [],
      body: "",
      latency: Date.now() - start,
      redirected: false,
      finalUrl: url,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
