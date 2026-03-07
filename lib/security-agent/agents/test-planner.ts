/**
 * Test Planner Agent — takes discovered routes and produces a test plan.
 *
 * Assigns scan types to each route:
 *  - Pages → headers, rate-limit
 *  - APIs → injection, xss, ssrf, auth, headers, rate-limit
 */

import type { DiscoveredRoute } from "./route-discovery";

export type ScanType =
  | "sql-injection"
  | "xss"
  | "ssrf"
  | "auth-bypass"
  | "headers"
  | "rate-limit";

export interface TestTask {
  route: DiscoveredRoute;
  scans: ScanType[];
}

export interface TestPlan {
  tasks: TestTask[];
  totalScans: number;
}

export function planTests(routes: DiscoveredRoute[]): TestPlan {
  const tasks: TestTask[] = [];
  let totalScans = 0;

  for (const route of routes) {
    const scans: ScanType[] = [];

    if (route.type === "api") {
      // APIs get the full treatment
      scans.push("sql-injection", "xss", "ssrf", "auth-bypass", "headers", "rate-limit");
    } else {
      // Pages just get header + rate-limit checks
      scans.push("headers", "rate-limit");
    }

    totalScans += scans.length;
    tasks.push({ route, scans });
  }

  return { tasks, totalScans };
}
