/**
 * Inngest function: API Tests — discover and validate API endpoints.
 *
 * Scans for API routes, tests each with appropriate HTTP methods,
 * validates response codes and checks for common API issues.
 */

import { inngest } from "@/lib/inngest";
import { getDb, ensureTables } from "@/lib/db";
import { parseApiRoutes } from "@/lib/route-parser";
import { getDeployment } from "@/lib/deployer";

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

export const runApiTests = inngest.createFunction(
  { id: "run-api-tests", name: "Run API Tests" },
  { event: "test/api.run" },
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

    // Discover API routes from sandbox filesystem
    const apiRoutes = await step.run("parse-api-routes", async () => {
      return parseApiRoutes(sandboxId);
    });

    if (apiRoutes.length === 0) {
      await step.run("mark-no-apis", async () => {
        const sql = getDb();
        const summary = "No API routes found in the project";
        await sql`UPDATE test_runs SET status = 'completed', finished_at = ${Date.now()}, summary = ${summary} WHERE id = ${runId}`;
      });
      return { ok: true, summary: "No API routes found", results: [] };
    }

    // Test each API route with multiple HTTP methods
    const results = await step.run("test-api-routes", async () => {
      const sql = getDb();
      const outcomes: Array<{
        endpoint: string;
        method: string;
        status: string;
        statusCode: number;
        latency: number;
        responseBody?: string;
      }> = [];

      for (const route of apiRoutes) {
        for (const method of HTTP_METHODS) {
          const url = `${baseUrl}${route}`;
          const start = Date.now();

          try {
            const res = await fetch(url, {
              method,
              signal: AbortSignal.timeout(15_000),
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              // Send empty JSON body for methods that typically have one
              body: method !== "GET" && method !== "DELETE" ? JSON.stringify({}) : undefined,
            });
            const elapsed = Date.now() - start;
            const bodyText = await res.text().catch(() => "");
            const truncatedBody = bodyText.slice(0, 2000);

            // 405 (Method Not Allowed) is expected for unsupported methods — mark as "skip"
            const testStatus = res.status === 405 ? "skip" : res.ok ? "pass" : "fail";

            outcomes.push({
              endpoint: route,
              method,
              status: testStatus,
              statusCode: res.status,
              latency: elapsed,
              responseBody: truncatedBody,
            });

            await sql`
              INSERT INTO api_test_results (run_id, sandbox_id, endpoint, method, status, status_code, latency, response_body, created_at)
              VALUES (${runId}, ${sandboxId}, ${route}, ${method}, ${testStatus}, ${res.status}, ${elapsed}, ${truncatedBody}, ${Date.now()})
            `;
          } catch (err: unknown) {
            const elapsed = Date.now() - start;
            const message = err instanceof Error ? err.message : String(err);

            outcomes.push({
              endpoint: route,
              method,
              status: "error",
              statusCode: 0,
              latency: elapsed,
              responseBody: message,
            });

            await sql`
              INSERT INTO api_test_results (run_id, sandbox_id, endpoint, method, status, status_code, latency, response_body, created_at)
              VALUES (${runId}, ${sandboxId}, ${route}, ${method}, 'error', ${0}, ${elapsed}, ${message}, ${Date.now()})
            `;
          }
        }
      }

      return outcomes;
    });

    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const errors = results.filter((r) => r.status === "error").length;
    const summary = `${apiRoutes.length} endpoints, ${passed} passed, ${failed} failed, ${errors} errors`;

    await step.run("finalize", async () => {
      const sql = getDb();
      await sql`UPDATE test_runs SET status = 'completed', finished_at = ${Date.now()}, summary = ${summary} WHERE id = ${runId}`;
    });

    return { ok: true, summary, results };
  }
);
