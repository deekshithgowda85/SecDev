/**
 * Inngest function: Test Suite — HTTP health checks on all discovered routes.
 */

import { inngest } from "@/lib/inngest";
import { getDb, ensureTables } from "@/lib/db";
import { parseRoutes } from "@/lib/route-parser";
import { getDeployment } from "@/lib/deployer";
import { notifyScanStarted, notifyScanCompleted } from "@/lib/email/notifications";

export const runTestSuite = inngest.createFunction(
  { id: "run-test-suite", name: "Run Test Suite" },
  { event: "test/suite.run" },
  async ({ event, step }) => {
    const { runId, sandboxId } = event.data as { runId: string; sandboxId: string };

    await step.run("init-db", async () => {
      await ensureTables();
    });

    await step.run("notify-start", async () => {
      await notifyScanStarted({ runId, sandboxId, scanType: "Route Health" });
    });

    // Get deployment info for the public URL
    const deployment = await step.run("get-deployment", async () => {
      return getDeployment(sandboxId);
    });

    if (!deployment) {
      await step.run("mark-failed-no-deployment", async () => {
        const sql = getDb();
        await sql`UPDATE test_runs SET status = 'failed', finished_at = ${Date.now()}, summary = 'Deployment not found' WHERE id = ${runId}`;
      });
      return { ok: false, error: "Deployment not found" };
    }

    const baseUrl = deployment.publicUrl;

    // Discover routes
    const parsed = await step.run("parse-routes", async () => {
      return parseRoutes(sandboxId);
    });

    // Test each route with HTTP requests
    const results = await step.run("test-routes", async () => {
      const sql = getDb();
      const outcomes: Array<{ route: string; status: string; statusCode: number; responseTime: number; error?: string }> = [];

      for (const route of parsed.routes) {
        const url = `${baseUrl}${route}`;
        const start = Date.now();
        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout(15_000),
            redirect: "follow",
          });
          const elapsed = Date.now() - start;
          const status = res.ok ? "pass" : "fail";
          outcomes.push({ route, status, statusCode: res.status, responseTime: elapsed });

          await sql`
            INSERT INTO test_results (run_id, sandbox_id, route, status, status_code, response_time, created_at)
            VALUES (${runId}, ${sandboxId}, ${route}, ${status}, ${res.status}, ${elapsed}, ${Date.now()})
          `;
        } catch (err: unknown) {
          const elapsed = Date.now() - start;
          const message = err instanceof Error ? err.message : String(err);
          outcomes.push({ route, status: "error", statusCode: 0, responseTime: elapsed, error: message });

          await sql`
            INSERT INTO test_results (run_id, sandbox_id, route, status, status_code, response_time, error, created_at)
            VALUES (${runId}, ${sandboxId}, ${route}, 'error', ${0}, ${elapsed}, ${message}, ${Date.now()})
          `;
        }
      }

      return outcomes;
    });

    // Generate summary
    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status !== "pass").length;
    const summary = `${passed}/${results.length} routes passed, ${failed} failed. Framework: ${parsed.framework}`;

    await step.run("finalize", async () => {
      const sql = getDb();
      await sql`UPDATE test_runs SET status = 'completed', finished_at = ${Date.now()}, summary = ${summary} WHERE id = ${runId}`;
    });

    await step.run("notify-complete", async () => {
      const score = results.length > 0 ? Math.round((passed / results.length) * 100) : 0;
      const sql = getDb();
      let logs: Array<{ level: string; message: string }> = [];
      try {
        const logRows = await sql`
          SELECT level, message FROM run_logs
          WHERE run_id = ${runId}
          ORDER BY id DESC LIMIT 30
        `;
        logs = logRows.reverse().map((r) => ({ level: String(r.level), message: String(r.message) }));
      } catch { /* non-critical */ }
      const errors = results
        .filter((r) => r.status !== "pass")
        .map((r) => r.error ? `${r.route}: ${r.error}` : `${r.route} (status ${r.statusCode})`);
      await notifyScanCompleted({
        runId, sandboxId, totalChecks: results.length, passed, failed, score, summary, logs, errors,
      });
    });

    return { ok: true, summary, results };
  }
);
