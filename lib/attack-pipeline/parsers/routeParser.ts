/**
 * Advanced Attack Pipeline Route Discovery Crawler Engine
 * Fixes #53: Implements explicit Fetch API request timeout controls via AbortController
 */

import { httpRequest } from "../utils/httpClient";

export type RouteCategory = "login" | "register" | "auth" | "admin" | "api" | "page";

export interface DiscoveredRoute {
  path: string;
  methods: string[];
  category: RouteCategory;
  type: "api" | "page";
  priority: number; // 1 = highest (login/register tested first)
}

export interface ParseResult {
  baseUrl: string;
  routes: DiscoveredRoute[];
  loginRoutes: DiscoveredRoute[];
  registerRoutes: DiscoveredRoute[];
  apiRoutes: DiscoveredRoute[];
  framework: string;
}

// High-value attack targets to probe
const PROBE_API_PATHS = [
  "/api/login", "/api/auth/login", "/api/auth/signin", "/api/signin",
  "/api/register", "/api/auth/register", "/api/auth/signup", "/api/signup",
  "/api/user", "/api/users", "/api/me", "/api/profile",
  "/api/admin", "/api/admin/users", "/api/admin/config",
  "/api/reset-password", "/api/forgot-password", "/api/change-password",
  "/api/auth/callback", "/api/auth/session", "/api/auth/token",
  "/api/health", "/api/status", "/api/version", "/api/config",
  "/api/deploy", "/api/test", "/api/tests/run",
  "/api/env-vars", "/api/sandboxes",
  "/api/upload", "/api/export", "/api/import",
  "/api/search", "/api/query",
];

const PROBE_PAGE_PATHS = [
  "/", "/login", "/register", "/signup", "/signin",
  "/dashboard", "/profile", "/settings", "/account",
  "/admin", "/admin/dashboard", "/admin/users",
  "/forgot-password", "/reset-password",
  "/about", "/docs",
];

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

const PRIORITY: Record<RouteCategory, number> = {
  login: 1, register: 2, auth: 3, admin: 4, api: 5, page: 6,
};

function categorize(path: string): RouteCategory {
  const p = path.toLowerCase();
  if (p.includes("login") || p.includes("signin")) return "login";
  if (p.includes("register") || p.includes("signup")) return "register";
  if (p.includes("auth") || p.includes("token") || p.includes("session") ||
      p.includes("password") || p.includes("forgot")) return "auth";
  if (p.includes("admin")) return "admin";
  if (p.startsWith("/api/")) return "api";
  return "page";
}

/**
 * Probe a single path — returns accepted HTTP methods or null if unreachable.
 */
async function probeEndpoint(baseUrl: string, path: string): Promise<string[] | null> {
  const url = `${baseUrl}${path}`;
  const initial = await httpRequest(url, { method: "GET", timeoutMs: 6_000 });
  // 0 = network error, treat as not found
  if (initial.status === 0 || initial.status === 404) return null;

  const accepted = new Set<string>();

  // GET successfully verifies if the status is not 405 Method Not Allowed
  if (initial.status !== 405) {
    accepted.add("GET");
  }

  // Check the Allow header of the response to parse accepted methods safely
  const allowHeader = Object.entries(initial.headers).find(
    ([k]) => k.toLowerCase() === "allow"
  )?.[1];

  if (allowHeader) {
    const parsed = allowHeader
      .split(",")
      .map((m) => m.trim().toUpperCase())
      .filter((m) => (HTTP_METHODS as readonly string[]).includes(m));
    for (const m of parsed) {
      accepted.add(m);
    }
  }

  return Array.from(accepted);
}

/**
 * Discover routes by probing well-known paths against the live target.
 */
async function probeCommonPaths(baseUrl: string): Promise<DiscoveredRoute[]> {
  const routes: DiscoveredRoute[] = [];

  // Run all probes concurrently (batched to 20 at a time)
  const allPaths = [...PROBE_API_PATHS, ...PROBE_PAGE_PATHS];
  const BATCH = 20;

  for (let i = 0; i < allPaths.length; i += BATCH) {
    const batch = allPaths.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (path) => {
        const methods = await probeEndpoint(baseUrl, path);
        if (!methods) return null;
        const category = categorize(path);
        return {
          path,
          methods,
          category,
          type: (path.startsWith("/api/") ? "api" : "page") as "api" | "page",
          priority: PRIORITY[category],
        };
      })
    );
    for (const r of results) if (r) routes.push(r);
  }

  return routes.sort((a, b) => a.priority - b.priority);
}

/**
 * Optionally parse routes from an E2B sandbox filesystem.
 */
async function parseFromSandbox(sandboxId: string): Promise<{ paths: string[]; framework: string }> {
  try {
    const { parseRoutes, parseApiRoutes } = await import("@/lib/route-parser");
    const [parsed, apiPaths] = await Promise.all([
      parseRoutes(sandboxId),
      parseApiRoutes(sandboxId),
    ]);
    return { paths: [...parsed.routes, ...apiPaths], framework: parsed.framework };
  } catch {
    return { paths: [], framework: "unknown" };
  }
}

/**
 * Main entry point — discover all routes for a deployment.
 */
export async function discoverRoutes(baseUrl: string, sandboxId?: string): Promise<ParseResult> {
  const cleanBase = baseUrl.replace(/\/$/, "");

  const [probedRoutes, sandboxData] = await Promise.all([
    probeCommonPaths(cleanBase),
    sandboxId ? parseFromSandbox(sandboxId) : Promise.resolve({ paths: [], framework: "unknown" }),
  ]);

  // Merge sandbox-only paths that weren't found by probing
  const knownPaths = new Set(probedRoutes.map((r) => r.path));
  const sandboxExtras: DiscoveredRoute[] = sandboxData.paths
    .filter((p) => !knownPaths.has(p))
    .map((path) => {
      const category = categorize(path);
      return {
        path,
        methods: ["GET"],
        category,
        type: (path.startsWith("/api/") ? "api" : "page") as "api" | "page",
        priority: PRIORITY[category],
      };
    });

  const allRoutes = [...probedRoutes, ...sandboxExtras].sort((a, b) => a.priority - b.priority);

  return {
    baseUrl: cleanBase,
    routes: allRoutes,
    loginRoutes: allRoutes.filter((r) => r.category === "login"),
    registerRoutes: allRoutes.filter((r) => r.category === "register"),
    apiRoutes: allRoutes.filter((r) => r.type === "api"),
    framework: sandboxData.framework || "unknown",
  };
}

interface RouteDiscoveryResult {
  url: string;
  status: number;
  isAccessible: boolean;
  discoveredRoutes: string[];
}

const DEFAULT_TIMEOUT_MS = 5000; // Explicit 5-second connection timeout guard

/**
 * Probes a target route URL endpoint with explicit execution boundary timeouts.
 * Guarantees hung sockets or infinite-loop dead links do not freeze the pipeline.
 */
export async function parseTargetRoute(targetUrl: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<RouteDiscoveryResult> {
  // Establish an instance of the native AbortController interface
  const controller = new AbortController();
  const { signal } = controller;

  // Schedule an asynchronous hardware rejection timeout macro thread
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const result: RouteDiscoveryResult = {
    url: targetUrl,
    status: 0,
    isAccessible: false,
    discoveredRoutes: [],
  };

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      signal, // Bind the abort interceptor token node directly to the network fetch parameters
      headers: {
        "User-Agent": "SecDev-AttackPipeline-RouteCrawler/1.0",
        "Accept": "text/html,application/xhtml+xml,application/json",
      },
    });

    result.status = response.status;
    result.isAccessible = response.ok;

    // If endpoint responds with scrapeable HTML content, search for secondary link extensions
    if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
      const htmlText = await response.text();
      
      // Basic dynamic regex scraping expression to gather sibling path strings
      const hrefRegex = /href=["']([^"']+)["']/g;
      let match;
      const discovered = new Set<string>();

      while ((match = hrefRegex.exec(htmlText)) !== null) {
        const link = match[1];
        if (link.startsWith("/") || link.startsWith(targetUrl)) {
          discovered.add(link);
        }
      }
      result.discoveredRoutes = Array.from(discovered);
    }

    return result;
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    const errMsg = error instanceof Error ? error.message : String(error);
    
    // Check if network pipeline error matches the Abort signal trigger
    if (errName === "AbortError") {
      console.error(`NETWORK TIMEOUT CRITICAL EXCEPTION: Connection to ${targetUrl} aborted after exceeding ${timeoutMs}ms restriction.`);
      throw new Error(`Pipeline socket termination: Endpoint [${targetUrl}] failed to respond within ${timeoutMs}ms.`);
    }

    console.error(`Route Discovery Endpoint Connectivity Failure [${targetUrl}]:`, errMsg);
    return result;
  } finally {
    // Clear out active timing handles to prevent process execution leaks
    clearTimeout(timeoutId);
  }
}