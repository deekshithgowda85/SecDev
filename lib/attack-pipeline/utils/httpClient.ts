/**
 * Enhanced HTTP client with cookie jar and session management.
 * Designed for stateful security testing workflows (e.g. login-then-probe).
 */

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

/** Parse Set-Cookie headers into a name→value map. */
function parseCookies(setCookieHeaders: string[]): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const header of setCookieHeaders) {
    const [nameVal] = header.split(";");
    const eqIdx = nameVal.indexOf("=");
    if (eqIdx > 0) {
      cookies[nameVal.slice(0, eqIdx).trim()] = nameVal.slice(eqIdx + 1).trim();
    }
  }
  return cookies;
}

function serializeCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
}

/**
 * Stateless HTTP request — does not maintain session state.
 */
export async function httpRequest(url: string, opts?: RequestOptions): Promise<HttpResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: opts?.method ?? "GET",
      headers: opts?.headers,
      body: opts?.body,
      redirect: opts?.followRedirects === false ? "manual" : "follow",
      signal: AbortSignal.timeout(opts?.timeoutMs ?? 15_000),
    });
    const body = await res.text().catch(() => "");
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });

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
      body: body.slice(0, 20_000),
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

/**
 * HTTP session that persists cookies across requests.
 * Use this to test stateful auth flows: login → protected-resource → verify.
 */
export class HttpSession {
  private cookieJar: Record<string, string> = {};
  private defaultHeaders: Record<string, string>;

  constructor(defaultHeaders?: Record<string, string>) {
    this.defaultHeaders = defaultHeaders ?? { "Content-Type": "application/json" };
  }

  async request(url: string, opts?: RequestOptions): Promise<HttpResult> {
    const cookieStr = serializeCookies(this.cookieJar);
    const headers: Record<string, string> = { ...this.defaultHeaders, ...opts?.headers };
    if (cookieStr) headers["Cookie"] = cookieStr;

    const result = await httpRequest(url, { ...opts, headers });

    // Absorb any new cookies from the response
    const newCookies = parseCookies(result.setCookies);
    Object.assign(this.cookieJar, newCookies);

    return result;
  }

  getCookies(): Readonly<Record<string, string>> { return { ...this.cookieJar }; }
  setCookie(name: string, value: string): void { this.cookieJar[name] = value; }
  clearCookies(): void { this.cookieJar = {}; }
  setDefaultHeader(key: string, value: string): void { this.defaultHeaders[key] = value; }
}
