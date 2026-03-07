/**
 * Inngest function: Security Agent — full autonomous security scan.
 *
 * Orchestrates the agent pipeline:
 *   1. Route Discovery Agent → discovers all pages + API routes
 *   2. Test Planner Agent → assigns scan types per route
 *   3. Security Scanner Agent → runs injection, XSS, SSRF, auth, headers, rate-limit
 *   4. API Tester Agent → validates correctness of API endpoints
 *   5. Performance Agent → load tests each route
 *   6. Result Collector → aggregates into scored report
 *   7. AI Analysis Agent → Groq/Llama summarises findings (low cost)
 *
 * AI is used ONLY in step 7. Everything else is deterministic.
 */

import { inngest } from "@/lib/inngest";
import { getDb, ensureTables } from "@/lib/db";
import { getDeployment } from "@/lib/deployer";
import { discoverRoutes } from "./agents/route-discovery";
import { planTests } from "./agents/test-planner";
import { runSecurityScans, type UnifiedFinding } from "./agents/security-scanner";
import { testApi, type ApiTestResult } from "./agents/api-tester";
import { loadTestRoute, type PerfResult } from "./agents/performance-tester";
import { collectResults } from "./agents/result-collector";
import { analyzeReport } from "./agents/ai-analyzer";

export const runSecurityAgent = inngest.createFunction(
  { id: "security-agent-run", name: "Security Agent Full Scan" },
  { event: "security-agent/scan.run" },
  async ({ event, step }) => {
    const { runId, sandboxId } = event.data as { runId: string; sandboxId: string };

    /* ── Step 0: Init ─────────────────────────────────────────────────── */
    await step.run("init-db", async () => { await ensureTables(); });

    const deployment = await step.run("get-deployment", async () => {
      return getDeployment(sandboxId);
    });

    if (!deployment) {
      await step.run("mark-failed-no-deploy", async () => {
        const sql = getDb();
        await sql`UPDATE security_agent_runs SET status = 'failed', finished_at = ${Date.now()}, summary = 'Deployment not found' WHERE id = ${runId}`;
      });
      return { ok: false, error: "Deployment not found" };
    }

    const baseUrl = deployment.publicUrl;

    /* ── Step 1: Route Discovery Agent ────────────────────────────────── */
    const discovery = await step.run("route-discovery", async () => {
      return discoverRoutes(sandboxId, baseUrl);
    });

    await step.run("update-route-count", async () => {
      const sql = getDb();
      await sql`UPDATE security_agent_runs SET total_routes = ${discovery.routes.length} WHERE id = ${runId}`;
    });

    /* ── Step 2: Test Planner Agent ───────────────────────────────────── */
    const plan = await step.run("test-planner", async () => {
      return planTests(discovery.routes);
    });

    /* ── Step 3: Security Scanner Agent  ──────────────────────────────── */
    const allFindings = await step.run("security-scans", async () => {
      const sql = getDb();
      const findings: UnifiedFinding[] = [];

      for (const task of plan.tasks) {
        const taskFindings = await runSecurityScans(baseUrl, task.route, task.scans);
        for (const f of taskFindings) {
          findings.push(f);
          // Persist each finding to the DB immediately
          await sql`
            INSERT INTO security_agent_findings
              (run_id, sandbox_id, route, check_type, result, severity, details, payload, created_at)
            VALUES
              (${runId}, ${sandboxId}, ${f.route}, ${f.checkType}, ${f.result}, ${f.severity}, ${f.details}, ${f.payload ?? null}, ${Date.now()})
          `;
        }
      }

      return findings;
    });

    /* ── Step 4: API Tester Agent ─────────────────────────────────────── */
    const apiResults = await step.run("api-testing", async () => {
      const results: ApiTestResult[] = [];
      const apiRoutes = discovery.routes.filter(r => r.type === "api");
      for (const route of apiRoutes) {
        const routeResults = await testApi(baseUrl, route);
        results.push(...routeResults);
      }
      return results;
    });

    /* ── Step 5: Performance Agent ────────────────────────────────────── */
    const perfResults = await step.run("performance-testing", async () => {
      const results: PerfResult[] = [];
      // Only load-test a sample (max 10 routes) to avoid excessive runtime
      const sample = discovery.routes.slice(0, 10);
      for (const route of sample) {
        const perf = await loadTestRoute(baseUrl, route);
        results.push(perf);
      }
      return results;
    });

    /* ── Step 6: Result Collector ─────────────────────────────────────── */
    const report = await step.run("collect-results", async () => {
      return collectResults(allFindings, apiResults, perfResults);
    });

    /* ── Step 7: AI Analysis Agent ────────────────────────────────────── */
    const aiAnalysis = await step.run("ai-analysis", async () => {
      return analyzeReport(report);
    });

    /* ── Step 8: Finalize ─────────────────────────────────────────────── */
    const summary = `Score: ${report.overallScore}/100 | ${report.totalRoutes} routes | ${report.criticalCount} critical, ${report.highCount} high, ${report.mediumCount} medium, ${report.lowCount} low`;

    await step.run("finalize", async () => {
      const sql = getDb();
      await sql`
        UPDATE security_agent_runs
        SET status       = 'completed',
            finished_at  = ${Date.now()},
            overall_score = ${report.overallScore},
            critical_count = ${report.criticalCount},
            high_count     = ${report.highCount},
            medium_count   = ${report.mediumCount},
            low_count      = ${report.lowCount},
            summary        = ${summary},
            ai_analysis    = ${JSON.stringify(aiAnalysis)}
        WHERE id = ${runId}
      `;
    });

    return { ok: true, summary, report, aiAnalysis };
  }
);
