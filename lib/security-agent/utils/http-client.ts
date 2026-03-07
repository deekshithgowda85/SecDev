/**
 * HTTP client utility for security testing — wraps fetch with timeouts,
 * response metadata capture, and safe error handling.
 */

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
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: opts?.method ?? "GET",
      headers: opts?.headers,
      body: opts?.body,
      redirect: opts?.redirect ?? "manual",
      signal: AbortSignal.timeout(opts?.timeoutMs ?? 15_000),
    });
    const body = await res.text().catch(() => "");
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    return { status: res.status, headers, body: body.slice(0, 10_000), latency: Date.now() - start };
  } catch (err: unknown) {
    return {
      status: 0,
      headers: {},
      body: "",
      latency: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
