/**
 * Inngest function: Test Suite — HTTP health checks on all discovered routes.
 */

import { inngest } from "@/lib/inngest";
import { getDb, ensureTables } from "@/lib/db";
import { parseRoutes } from "@/lib/route-parser";
import { getDeployment } from "@/lib/deployer";

export const runTestSuite = inngest.createFunction(
  { id: "run-test-suite", name: "Run Test Suite" },
  { event: "test/suite.run" },
  async ({ event, step }) => {
    const { runId, sandboxId } = event.data as { runId: string; sandboxId: string };

    await step.run("init-db", async () => {
      await ensureTables();
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

    return { ok: true, summary, results };
  }
);
