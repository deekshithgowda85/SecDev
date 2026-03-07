/**
 * Result Collector Agent — aggregates findings from all scan agents into a
 * unified security report structure.
 */

import type { UnifiedFinding } from "./security-scanner";
import type { ApiTestResult } from "./api-tester";
import type { PerfResult } from "./performance-tester";

export interface RouteReport {
  route: string;
  security: UnifiedFinding[];
  api: ApiTestResult[];
  performance: PerfResult | null;
  score: number;                // 0–100
}

export interface SecurityReport {
  totalRoutes: number;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  overallScore: number;        // 0–100
  routeReports: RouteReport[];
  coverageMap: Array<{ route: string; tested: boolean; hasIssues: boolean }>;
}

/**
 * Collect and score all results into a SecurityReport.
 */
export function collectResults(
  allFindings: UnifiedFinding[],
  apiResults: ApiTestResult[],
  perfResults: PerfResult[]
): SecurityReport {
  // Group findings by route
  const routeMap = new Map<string, { findings: UnifiedFinding[]; api: ApiTestResult[]; perf: PerfResult | null }>();

  const ensureRoute = (route: string) => {
    if (!routeMap.has(route)) routeMap.set(route, { findings: [], api: [], perf: null });
    return routeMap.get(route)!;
  };

  for (const f of allFindings) ensureRoute(f.route).findings.push(f);
  for (const a of apiResults) ensureRoute(a.route).api.push(a);
  for (const p of perfResults) { const e = ensureRoute(p.route); e.perf = p; }

  const criticalCount = allFindings.filter(f => f.result === "fail" && f.severity === "critical").length;
  const highCount     = allFindings.filter(f => f.result === "fail" && f.severity === "high").length;
  const mediumCount   = allFindings.filter(f => f.result === "fail" && f.severity === "medium").length;
  const lowCount      = allFindings.filter(f => f.result === "fail" && f.severity === "low").length;

  // Score: start at 100 and deduct points per severity
  const deductions = criticalCount * 15 + highCount * 8 + mediumCount * 3 + lowCount * 1;
  const overallScore = Math.max(0, Math.min(100, 100 - deductions));

  const routeReports: RouteReport[] = [];
  const coverageMap: SecurityReport["coverageMap"] = [];

  for (const [route, data] of routeMap) {
    const routeFails = data.findings.filter(f => f.result === "fail");
    const routeDeductions =
      routeFails.filter(f => f.severity === "critical").length * 15 +
      routeFails.filter(f => f.severity === "high").length * 8 +
      routeFails.filter(f => f.severity === "medium").length * 3 +
      routeFails.filter(f => f.severity === "low").length * 1;
    const routeScore = Math.max(0, Math.min(100, 100 - routeDeductions));

    routeReports.push({
      route,
      security: data.findings,
      api: data.api,
      performance: data.perf,
      score: routeScore,
    });

    coverageMap.push({
      route,
      tested: true,
      hasIssues: routeFails.length > 0,
    });
  }

  return {
    totalRoutes: routeMap.size,
    totalFindings: allFindings.filter(f => f.result === "fail").length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    overallScore,
    routeReports: routeReports.sort((a, b) => a.score - b.score), // worst first
    coverageMap,
  };
}
