/**
 * POST /api/attack-pipeline
 *   Body: { baseUrl: string; sandboxId?: string; useAi?: boolean; includePerformance?: boolean }
 *   Response: text/event-stream  (SSE events: progress | complete | error)
 *
 * GET  /api/attack-pipeline
 *   Query: ?sandboxId=xxx   or no filter (returns user's last 30 runs)
 *   Response: { ok: true, runs: AttackPipelineRun[] }
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, ensureTables } from "@/lib/db";
import { runScan } from "@/lib/attack-pipeline/pipeline/runScan";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5-minute limit (Vercel Pro / hobby has 60–300 s)

// ── POST — start scan and stream progress ─────────────────────────────────────
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { baseUrl?: string; sandboxId?: string; useAi?: boolean; includePerformance?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { baseUrl, sandboxId, useAi = false, includePerformance = false } = body;

  if (!baseUrl || typeof baseUrl !== "string") {
    return NextResponse.json({ ok: false, error: "baseUrl is required" }, { status: 400 });
  }

  // Basic URL validation — must start with http(s)://
  if (!/^https?:\/\/.+/i.test(baseUrl)) {
    return NextResponse.json(
      { ok: false, error: "baseUrl must start with http:// or https://" },
      { status: 400 }
    );
  }

  await ensureTables();
  const sql = getDb();

  const runId = `ap_${randomBytes(8).toString("hex")}`;

  // Insert run record immediately so history shows it
  await sql`
    INSERT INTO attack_pipeline_runs
      (id, user_id, base_url, sandbox_id, status, created_at)
    VALUES
      (${runId}, ${userId}, ${baseUrl}, ${sandboxId ?? null}, 'running', ${Date.now()})
  `;

  // Build SSE stream
  const encoder = new TextEncoder();
  const transform = new TransformStream<Uint8Array, Uint8Array>();
  const writer = transform.writable.getWriter();

  const send = (data: object) => {
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch { /* client disconnected */ }
  };

  // Run the scan in a detached async task
  (async () => {
    try {
      send({ type: "start", runId, baseUrl });

      const report = await runScan({
        baseUrl,
        sandboxId,
        useAi,
        includePerformance,
        maxRoutes: 20,
        onProgress: (msg: string) => send({ type: "progress", msg }),
      });

      // Persist results
      const aiSummary = report.aiAnalysis?.summary ?? null;
      await sql`
        UPDATE attack_pipeline_runs SET
          status         = 'completed',
          finished_at    = ${Date.now()},
          routes_found   = ${report.routesDiscovered},
          overall_score  = ${report.overallScore},
          risk_level     = ${report.riskLevel},
          critical_count = ${report.summary.critical},
          high_count     = ${report.summary.high},
          medium_count   = ${report.summary.medium},
          low_count      = ${report.summary.low},
          passed_count   = ${report.summary.passed},
          summary        = ${aiSummary},
          report_json    = ${JSON.stringify(report)}
        WHERE id = ${runId}
      `;

      send({ type: "complete", runId, report });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      send({ type: "error", runId, error: msg });
      try {
        await sql`
          UPDATE attack_pipeline_runs
          SET status = 'failed', finished_at = ${Date.now()}, summary = ${msg}
          WHERE id = ${runId}
        `;
      } catch { /* ignore */ }
    } finally {
      writer.close();
    }
  })();

  return new Response(transform.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}

// ── GET — list runs ───────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const sandboxId = searchParams.get("sandboxId");

  await ensureTables();
  const sql = getDb();

  const rows = sandboxId
    ? await sql`
        SELECT id, base_url, sandbox_id, status, created_at, finished_at,
               routes_found, overall_score, risk_level,
               critical_count, high_count, medium_count, low_count, passed_count, summary
        FROM attack_pipeline_runs
        WHERE user_id = ${userId} AND sandbox_id = ${sandboxId}
        ORDER BY created_at DESC
        LIMIT 30
      `
    : await sql`
        SELECT id, base_url, sandbox_id, status, created_at, finished_at,
               routes_found, overall_score, risk_level,
               critical_count, high_count, medium_count, low_count, passed_count, summary
        FROM attack_pipeline_runs
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 30
      `;

  return NextResponse.json({ ok: true, runs: rows });
}
