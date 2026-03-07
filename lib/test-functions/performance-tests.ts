/**
 * Inngest function: Performance Tests — load simulation on deployed routes.
 *
 * Sends concurrent requests to each route and measures response times,
 * calculates avg/min/max and success rates.
 */

import { inngest } from "@/lib/inngest";
import { getDb, ensureTables } from "@/lib/db";
import { parseRoutes } from "@/lib/route-parser";
import { getDeployment } from "@/lib/deployer";

const CONCURRENT_REQUESTS = 10;
const REQUESTS_PER_ROUTE = 20;

export const runPerformanceTests = inngest.createFunction(
  { id: "run-performance-tests", name: "Run Performance Tests" },
  { event: "test/performance.run" },
  async ({ event, step }) => {
    const { runId, sandboxId } = event.data as { runId: string; sandboxId: string };

    await step.run("init-db", async () => {
      await ensureTables();
    });

    const deployment = await step.run("get-deployment", async () => {
      return getDeployment(sandboxId);
    });

    if (!deployment) {
      await step.run("mark-failed", async () => {
        const sql = getDb();
        await sql`UPDATE test_runs SET status = 'failed', finished_at = ${Date.now()}, summary = 'Deployment not found' WHERE id = ${runId}`;
      });
      return { ok: false, error: "Deployment not found" };
    }

    const baseUrl = deployment.publicUrl;

    const parsed = await step.run("parse-routes", async () => {
      return parseRoutes(sandboxId);
    });

    const results = await step.run("load-test", async () => {
      const sql = getDb();
      const routeResults: Array<{
        route: string;
        avgResponse: number;
        maxResponse: number;
        minResponse: number;
        successRate: number;
      }> = [];

      for (const route of parsed.routes) {
        const url = `${baseUrl}${route}`;
        const times: number[] = [];
        let successes = 0;

        // Send requests in batches of CONCURRENT_REQUESTS
        for (let i = 0; i < REQUESTS_PER_ROUTE; i += CONCURRENT_REQUESTS) {
          const batch = Math.min(CONCURRENT_REQUESTS, REQUESTS_PER_ROUTE - i);
          const promises = Array.from({ length: batch }, async () => {
            const start = Date.now();
            try {
              const res = await fetch(url, {
                signal: AbortSignal.timeout(15_000),
              });
              const elapsed = Date.now() - start;
              times.push(elapsed);
              if (res.ok) successes++;
            } catch {
              times.push(Date.now() - start);
            }
          });
          await Promise.all(promises);
        }

        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const max = Math.max(...times);
        const min = Math.min(...times);
        const successRate = Math.round((successes / REQUESTS_PER_ROUTE) * 100) / 100;

        routeResults.push({ route, avgResponse: avg, maxResponse: max, minResponse: min, successRate });

        await sql`
          INSERT INTO performance_results (run_id, sandbox_id, route, avg_response, max_response, min_response, concurrent_requests, success_rate, created_at)
          VALUES (${runId}, ${sandboxId}, ${route}, ${avg}, ${max}, ${min}, ${CONCURRENT_REQUESTS}, ${successRate}, ${Date.now()})
        `;
      }

      return routeResults;
    });

    const avgOverall = results.length > 0
      ? Math.round(results.reduce((a, b) => a + b.avgResponse, 0) / results.length)
      : 0;
    const avgSuccessRate = results.length > 0
      ? Math.round(results.reduce((a, b) => a + b.successRate, 0) / results.length * 100)
      : 0;

    const summary = `${parsed.routes.length} routes, avg ${avgOverall}ms, ${avgSuccessRate}% success rate, ${REQUESTS_PER_ROUTE} reqs/route`;

    await step.run("finalize", async () => {
      const sql = getDb();
      await sql`UPDATE test_runs SET status = 'completed', finished_at = ${Date.now()}, summary = ${summary} WHERE id = ${runId}`;
    });

    return { ok: true, summary, results };
  }
);
