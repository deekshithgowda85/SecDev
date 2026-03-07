/**
 * API Tester Agent — validates correctness of discovered API endpoints.
 *
 * Checks:
 *  - Status codes per method
 *  - Response format (valid JSON?)
 *  - Response time
 *  - Error handling (malformed bodies)
 */

import { httpRequest } from "../utils/http-client";
import type { DiscoveredRoute } from "./route-discovery";

export interface ApiTestResult {
  route: string;
  method: string;
  status: "pass" | "fail" | "error" | "skip";
  statusCode: number;
  latency: number;
  isJson: boolean;
  responseBody: string;
}

/**
 * Test a single API endpoint with all its accepted methods.
 */
export async function testApi(
  baseUrl: string,
  route: DiscoveredRoute
): Promise<ApiTestResult[]> {
  const results: ApiTestResult[] = [];
  const url = `${baseUrl}${route.path}`;

  for (const method of route.methods) {
    // Normal request
    const res = await httpRequest(url, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: method !== "GET" && method !== "DELETE" ? JSON.stringify({}) : undefined,
    });

    let isJson = false;
    try { JSON.parse(res.body); isJson = true; } catch { /* not json */ }

    const testStatus = res.error ? "error" : res.status >= 200 && res.status < 500 ? "pass" : "fail";

    results.push({
      route: route.path,
      method,
      status: testStatus,
      statusCode: res.status,
      latency: res.latency,
      isJson,
      responseBody: res.body.slice(0, 2000),
    });

    // Malformed body test (for POST/PUT/PATCH)
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      const malformedRes = await httpRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: "not valid json {{{",
      });

      // A well-behaved API should return 400, not 500
      if (malformedRes.status === 500) {
        results.push({
          route: route.path,
          method: `${method}-malformed`,
          status: "fail",
          statusCode: malformedRes.status,
          latency: malformedRes.latency,
          isJson: false,
          responseBody: "Server returned 500 on malformed JSON body (should return 400)",
        });
      }
    }
  }

  return results;
}
