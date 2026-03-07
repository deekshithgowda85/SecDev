/**
 * Route Discovery Agent — discovers all page routes + API routes from a
 * deployed sandbox.  Wraps the existing route-parser and adds API route
 * discovery with HTTP method detection.
 */

import { parseRoutes, parseApiRoutes, type ParsedRoutes } from "@/lib/route-parser";
import { httpRequest } from "../utils/http-client";

export interface DiscoveredRoute {
  path: string;
  methods: string[];
  type: "page" | "api";
}

export interface DiscoveryResult {
  framework: ParsedRoutes["framework"];
  routes: DiscoveredRoute[];
  totalPages: number;
  totalApis: number;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

/**
 * Discover all routes (pages + APIs) and probe which HTTP methods each API accepts.
 */
export async function discoverRoutes(
  sandboxId: string,
  baseUrl: string
): Promise<DiscoveryResult> {
  // Use existing parsers
  const [parsed, apiPaths] = await Promise.all([
    parseRoutes(sandboxId),
    parseApiRoutes(sandboxId),
  ]);

  const routes: DiscoveredRoute[] = [];

  // Page routes — only GET
  for (const r of parsed.routes) {
    routes.push({ path: r, methods: ["GET"], type: "page" });
  }

  // API routes — probe methods
  for (const apiPath of apiPaths) {
    const url = `${baseUrl}${apiPath}`;
    const accepted: string[] = [];

    // Probe each method in parallel
    const probes = HTTP_METHODS.map(async (method) => {
      const res = await httpRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method !== "GET" && method !== "DELETE" ? JSON.stringify({}) : undefined,
        timeoutMs: 10_000,
      });
      // 405 = method not supported, anything else = method accepted
      if (res.status !== 405 && res.status !== 0) {
        return method;
      }
      return null;
    });

    const results = await Promise.all(probes);
    for (const m of results) {
      if (m) accepted.push(m);
    }

    routes.push({
      path: apiPath,
      methods: accepted.length > 0 ? accepted : ["GET"],
      type: "api",
    });
  }

  return {
    framework: parsed.framework,
    routes,
    totalPages: parsed.routes.length,
    totalApis: apiPaths.length,
  };
}
