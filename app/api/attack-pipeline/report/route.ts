/**
 * GET /api/attack-pipeline/report?runId=ap_xxx
 * Returns the full VulnerabilityReport JSON for a completed run.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, ensureTables } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  if (!runId) {
    return NextResponse.json({ ok: false, error: "runId is required" }, { status: 400 });
  }

  await ensureTables();
  const sql = getDb();

  const rows = await sql`
    SELECT id, base_url, sandbox_id, status, created_at, finished_at,
           routes_found, overall_score, risk_level,
           critical_count, high_count, medium_count, low_count, passed_count,
           summary, report_json
    FROM attack_pipeline_runs
    WHERE id = ${runId} AND user_id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
  }

  const row = rows[0];
  let report = null;
  if (row.report_json) {
    try {
      report = JSON.parse(row.report_json as string);
    } catch { /* ignore malformed JSON */ }
  }

  return NextResponse.json({
    ok: true,
    run: {
      id:            row.id,
      baseUrl:       row.base_url,
      sandboxId:     row.sandbox_id,
      status:        row.status,
      createdAt:     row.created_at,
      finishedAt:    row.finished_at,
      routesFound:   row.routes_found,
      overallScore:  row.overall_score,
      riskLevel:     row.risk_level,
      criticalCount: row.critical_count,
      highCount:     row.high_count,
      mediumCount:   row.medium_count,
      lowCount:      row.low_count,
      passedCount:   row.passed_count,
      summary:       row.summary,
    },
    report,
  });
}
