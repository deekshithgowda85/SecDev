/**
 * Performance Tester Agent — measures latency, throughput, and error rate
 * under concurrent load for each route.
 */

import { httpRequest } from "../utils/http-client";
import type { DiscoveredRoute } from "./route-discovery";

export interface PerfResult {
  route: string;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p95Latency: number;
  successRate: number;
  totalRequests: number;
  errorsCount: number;
}

const TOTAL_REQUESTS = 50;
const CONCURRENCY = 10;

/**
 * Run a load test against a single route.
 */
export async function loadTestRoute(
  baseUrl: string,
  route: DiscoveredRoute
): Promise<PerfResult> {
  const url = `${baseUrl}${route.path}`;
  const latencies: number[] = [];
  let successes = 0;
  let errors = 0;

  for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENCY) {
    const batch = Math.min(CONCURRENCY, TOTAL_REQUESTS - i);
    const promises = Array.from({ length: batch }, () =>
      httpRequest(url, { timeoutMs: 15_000 })
    );
    const results = await Promise.all(promises);
    for (const res of results) {
      latencies.push(res.latency);
      if (res.status >= 200 && res.status < 500) {
        successes++;
      } else {
        errors++;
      }
    }
  }

  latencies.sort((a, b) => a - b);
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? avg;

  return {
    route: route.path,
    avgLatency: avg,
    minLatency: Math.min(...latencies),
    maxLatency: Math.max(...latencies),
    p95Latency: p95,
    successRate: Math.round((successes / TOTAL_REQUESTS) * 100) / 100,
    totalRequests: TOTAL_REQUESTS,
    errorsCount: errors,
  };
}
