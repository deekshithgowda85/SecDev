/**
 * Main attack-pipeline entry point.
 *
 * Pipeline (4 steps):
 *   1. Route discovery   — probe baseUrl + optional E2B sandbox filesystem
 *   2. Security scan     — all attack agents (SQL, auth, injection, parameter, headers)
 *   3. Performance scan  — load test sampled routes (optional)
 *   4. AI analysis       — Groq summary + recommendations (optional, falls back to deterministic)
 *
 * Usage:
 *   import { runScan } from "@/lib/attack-pipeline/pipeline/runScan";
 *   const report = await runScan({ baseUrl: "https://myapp.com", useAi: true });
 */

import { discoverRoutes }       from "../parsers/routeParser";
import { runSecurityScan }      from "../scanners/securityScanner";
import { runPerformanceScan }   from "../scanners/performanceScanner";
import type { UnifiedFinding }  from "../agents/orchestrator";
import type { VibeTestFinding, ApiValidationResult } from "../scanners/securityScanner";
import type { PerformanceScanReport } from "../scanners/performanceScanner";

// ── Public API types ──────────────────────────────────────────────────────────

export interface ScanOptions {
  /** Base URL to scan, e.g. "https://myapp.com" (no trailing slash) */
  baseUrl: string;
  /** E2B sandbox ID for filesystem-based route discovery (optional) */
  sandboxId?: string;
  /** Use Groq AI for payload augmentation + result analysis (requires GROQ_API_KEY) */
  useAi?: boolean;
  /** Include performance load-testing step */
  includePerformance?: boolean;
  /** Maximum number of routes to test (default: 20) */
  maxRoutes?: number;
  /** Progress callback for live streaming updates */
  onProgress?: (msg: string) => void;
}

export interface AiInsight {
  summary: string;
  riskLevel: "Critical" | "High" | "Medium" | "Low" | "Minimal";
  criticalFindings: string[];
  recommendations: string[];
  attackReplay: string[];
}

export interface VulnerabilityReport {
  scanId: string;
  baseUrl: string;
  scannedAt: string;
  durationMs: number;
  framework: string;
  routesDiscovered: number;
  overallScore: number;
  riskLevel: string;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    passed: number;
  };
  findings: UnifiedFinding[];
  vibetest: VibeTestFinding[];
  apiValidation: ApiValidationResult[];
  performance?: PerformanceScanReport;
  coverage: Array<{ route: string; tested: boolean; hasIssues: boolean }>;
  aiAnalysis: AiInsight;
}

// ── AI analysis (Step 4) ──────────────────────────────────────────────────────

async function callGroqAnalysis(
  reportBase: Omit<VulnerabilityReport, "aiAnalysis">
): Promise<AiInsight | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const topFailures = reportBase.findings
    .filter((f) => f.result === "fail")
    .slice(0, 30)
    .map((f) => ({
      route:      f.route,
      type:       f.checkType,
      severity:   f.severity,
      details:    f.details,
      curlReplay: f.curlReplay,
    }));

  const prompt = `You are a senior application security engineer reviewing automated pen-test results.

Target: ${reportBase.baseUrl}
Score: ${reportBase.overallScore}/100
Routes scanned: ${reportBase.routesDiscovered}
Critical: ${reportBase.summary.critical} | High: ${reportBase.summary.high} | Medium: ${reportBase.summary.medium} | Low: ${reportBase.summary.low}

Top findings:
${JSON.stringify(topFailures, null, 2)}

Respond ONLY with valid JSON (no markdown fence, no explanation):
{
  "summary": "2–3 sentence executive summary of the overall security posture",
  "riskLevel": "Critical|High|Medium|Low|Minimal",
  "criticalFindings": ["most important finding 1", "finding 2 (max 4 items)"],
  "recommendations": ["actionable fix 1 with code guidance", "fix 2 (max 4 items)"],
  "attackReplay": ["curl command reproducing highest-severity finding"]
}`;

  try {
    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey });

    const res = await groq.chat.completions.create({
      model:       "llama-3.1-8b-instant",
      messages:    [{ role: "user", content: prompt }],
      max_tokens:  700,
      temperature: 0.2,
    });

    const raw = res.choices[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as AiInsight;
  } catch { /* fall through to deterministic */ }

  return null;
}

function buildDeterministicInsight(
  reportBase: Omit<VulnerabilityReport, "aiAnalysis">
): AiInsight {
  const { summary, overallScore, routesDiscovered, durationMs, findings } = reportBase;

  const riskLevel: AiInsight["riskLevel"] =
    summary.critical > 0 ? "Critical" :
    summary.high     > 0 ? "High"     :
    summary.medium   > 0 ? "Medium"   :
    summary.low      > 0 ? "Low"      : "Minimal";

  const topFailures = findings
    .filter((f) => f.result === "fail" && (f.severity === "critical" || f.severity === "high"))
    .slice(0, 4)
    .map((f) => `${f.checkType} on ${f.route}: ${f.details}`);

  const recs: string[] = [];
  if (summary.critical > 0)
    recs.push("Use parameterized queries for all DB access and never pass user input to shell commands");
  if (summary.high > 0)
    recs.push("Implement proper JWT validation — reject alg=none and verify signatures server-side");
  if (summary.medium > 0)
    recs.push("Add security headers (CSP, HSTS, X-Frame-Options) and rate-limit auth endpoints");
  if (recs.length === 0)
    recs.push("Security posture is good — schedule regular penetration tests to maintain this standard");

  const topCurl = findings.find((f) => f.curlReplay && f.result === "fail");

  return {
    summary: `Scanned ${routesDiscovered} routes in ${Math.round(durationMs / 1000)}s. Overall score: ${overallScore}/100. Found ${summary.critical} critical, ${summary.high} high, ${summary.medium} medium vulnerabilities.`,
    riskLevel,
    criticalFindings: topFailures.length > 0 ? topFailures : ["No critical vulnerabilities detected"],
    recommendations: recs,
    attackReplay: topCurl?.curlReplay ? [topCurl.curlReplay] : [],
  };
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

/**
 * Execute the full attack pipeline and return a VulnerabilityReport.
 */
export async function runScan(opts: ScanOptions): Promise<VulnerabilityReport> {
  const {
    baseUrl,
    sandboxId,
    useAi            = false,
    includePerformance = true,
    maxRoutes        = 20,
    onProgress,
  } = opts;

  const scanId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const start  = Date.now();
  const cleanBase = baseUrl.replace(/\/$/, "");

  onProgress?.(`[${scanId}] Starting attack-pipeline scan of ${cleanBase}`);

  // ── Step 1: Route Discovery ─────────────────────────────────────────────────
  onProgress?.("Step 1/4: Discovering routes…");
  const discovery = await discoverRoutes(cleanBase, sandboxId);
  const routes    = discovery.routes.slice(0, maxRoutes);

  onProgress?.(
    `Found ${routes.length} routes (${discovery.loginRoutes.length} auth endpoints, ${discovery.apiRoutes.length} API endpoints)`
  );

  // ── Step 2: Security Scan ───────────────────────────────────────────────────
  onProgress?.("Step 2/4: Running security agents…");
  const securityResult = await runSecurityScan(cleanBase, routes, onProgress);

  // ── Step 3: Performance Scan ────────────────────────────────────────────────
  let perfReport: PerformanceScanReport | undefined;
  if (includePerformance && discovery.apiRoutes.length > 0) {
    onProgress?.("Step 3/4: Running performance tests…");
    perfReport = await runPerformanceScan(cleanBase, discovery.apiRoutes, { maxRoutes: 10 });
  } else {
    onProgress?.("Step 3/4: Skipping performance tests (no API routes / disabled)");
  }

  // Coverage map
  const testedPaths = new Set(securityResult.findings.map((f) => f.route));
  const coverage = routes.map((r) => ({
    route:     r.path,
    tested:    testedPaths.has(r.path),
    hasIssues: securityResult.findings.some((f) => f.route === r.path && f.result === "fail"),
  }));

  const reportBase: Omit<VulnerabilityReport, "aiAnalysis"> = {
    scanId,
    baseUrl:          cleanBase,
    scannedAt:        new Date().toISOString(),
    durationMs:       Date.now() - start,
    framework:        discovery.framework,
    routesDiscovered: routes.length,
    overallScore:     securityResult.overallScore,
    riskLevel:
      securityResult.criticalCount > 0 ? "Critical" :
      securityResult.highCount     > 0 ? "High"     :
      securityResult.mediumCount   > 0 ? "Medium"   : "Low",
    summary: {
      critical: securityResult.criticalCount,
      high:     securityResult.highCount,
      medium:   securityResult.mediumCount,
      low:      securityResult.lowCount,
      passed:   securityResult.passCount,
    },
    findings:      securityResult.findings,
    vibetest:      securityResult.vibeFindings,
    apiValidation: securityResult.apiResults,
    performance:   perfReport,
    coverage,
  };

  // ── Step 4: AI Analysis ─────────────────────────────────────────────────────
  onProgress?.("Step 4/4: Generating analysis…");
  const aiAnalysis = useAi
    ? (await callGroqAnalysis(reportBase)) ?? buildDeterministicInsight(reportBase)
    : buildDeterministicInsight(reportBase);

  onProgress?.(
    `Scan complete — score ${reportBase.overallScore}/100 | ${reportBase.summary.critical} critical, ${reportBase.summary.high} high findings`
  );

  return { ...reportBase, aiAnalysis };
}
