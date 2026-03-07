/**
 * Performance Scanner — load tests discovered routes and reports
 * latency percentiles, throughput, and error rates.
 *
 * Thresholds:
 *   avg > 1000ms     → "slow"
 *   p95 > 2000ms     → "degraded"
 *   success < 95%    → "failing"
 */

import { httpRequest } from "../utils/httpClient";
import type { DiscoveredRoute } from "../parsers/routeParser";

export interface PerformanceResult {
  route: string;
  totalRequests: number;
  concurrency: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p95Latency: number;
  p99Latency: number;
  successRate: number;
  errorRate: number;
  requestsPerSecond: number;
  errors: number;
  status: "pass" | "slow" | "degraded" | "failing";
}

export interface PerformanceScanReport {
  routes: PerformanceResult[];
  avgScoreAcrossRoutes: number;
  slowestRoute: string | null;
  mostErrorProne: string | null;
}

const THRESHOLDS = {
  SLOW_AVG:    1_000, // ms
  DEGRADED_P95: 2_000, // ms
  MIN_SUCCESS:  0.95,  // 95%
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function loadTestRoute(
  baseUrl: string,
  route: DiscoveredRoute,
  totalRequests: number = 50,
  concurrency: number = 10
): Promise<PerformanceResult> {
  const url = `${baseUrl}${route.path}`;
  const latencies: number[] = [];
  let successes = 0;
  let errors = 0;

  const start = Date.now();

  // Send requests in concurrent batches
  for (let sent = 0; sent < totalRequests; sent += concurrency) {
    const batchSize = Math.min(concurrency, totalRequests - sent);
    const batch = await Promise.all(
      Array.from({ length: batchSize }, () =>
        httpRequest(url, { method: "GET", timeoutMs: 15_000 })
      )
    );

    for (const res of batch) {
      latencies.push(res.latency);
      if (!res.error && res.status >= 200 && res.status < 500) {
        successes++;
      } else {
        errors++;
      }
    }
  }

  const elapsed = (Date.now() - start) / 1_000; // seconds
  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = sorted.length > 0
    ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length)
    : 0;

  const successRate = totalRequests > 0 ? successes / totalRequests : 0;
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);

  let status: PerformanceResult["status"] = "pass";
  if (successRate < THRESHOLDS.MIN_SUCCESS)  status = "failing";
  else if (p95 > THRESHOLDS.DEGRADED_P95)    status = "degraded";
  else if (avg > THRESHOLDS.SLOW_AVG)         status = "slow";

  return {
    route: route.path,
    totalRequests,
    concurrency,
    avgLatency:         avg,
    minLatency:         sorted[0] ?? 0,
    maxLatency:         sorted[sorted.length - 1] ?? 0,
    p95Latency:         p95,
    p99Latency:         p99,
    successRate:        Math.round(successRate * 10_000) / 100,  // e.g. 98.40
    errorRate:          Math.round((1 - successRate) * 10_000) / 100,
    requestsPerSecond:  elapsed > 0 ? Math.round((totalRequests / elapsed) * 10) / 10 : 0,
    errors,
    status,
  };
}

/**
 * Run performance tests against sampled routes.
 * Routes are tested sequentially to avoid overwhelming the target server.
 */
export async function runPerformanceScan(
  baseUrl: string,
  routes: DiscoveredRoute[],
  options: {
    totalRequests?: number;
    concurrency?: number;
    maxRoutes?: number;
  } = {}
): Promise<PerformanceScanReport> {
  const { totalRequests = 50, concurrency = 10, maxRoutes = 15 } = options;
  const sample = routes.slice(0, maxRoutes);
  const results: PerformanceResult[] = [];

  // Sequential per route to keep load reasonable
  for (const route of sample) {
    const result = await loadTestRoute(baseUrl, route, totalRequests, concurrency);
    results.push(result);
  }

  const byLatency  = [...results].sort((a, b) => b.avgLatency - a.avgLatency);
  const byErrors   = [...results].sort((a, b) => b.errorRate  - a.errorRate);
  const passing    = results.filter((r) => r.status === "pass").length;
  const avgScore   = results.length > 0 ? Math.round((passing / results.length) * 100) : 100;

  return {
    routes:                 results,
    avgScoreAcrossRoutes:   avgScore,
    slowestRoute:           byLatency[0]?.route ?? null,
    mostErrorProne:         (byErrors[0]?.errorRate ?? 0) > 0 ? (byErrors[0]?.route ?? null) : null,
  };
}
