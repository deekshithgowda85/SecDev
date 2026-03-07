/**
 * GET /api/security-agent/report?runId=xxx
 *
 * Fetch the full security agent report for a given run, including:
 *  - Run metadata & AI analysis
 *  - All individual findings
 *  - Coverage map
 */

import { NextResponse } from "next/server";
import { getDb, ensureTables } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    await ensureTables();
    const sql = getDb();
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return NextResponse.json({ ok: false, error: "runId is required" }, { status: 400 });
    }

    // Get run and verify ownership
    const runRows = await sql`SELECT * FROM security_agent_runs WHERE id = ${runId}`;
    if (!runRows.length) {
      return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
    }
    const run = runRows[0];
    if (run.user_id && run.user_id !== userId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Get all findings
    const findings = await sql`
      SELECT * FROM security_agent_findings
      WHERE run_id = ${runId}
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 0
          WHEN 'high'     THEN 1
          WHEN 'medium'   THEN 2
          WHEN 'low'      THEN 3
          ELSE 4
        END,
        created_at ASC
    `;

    // Build coverage map from findings
    const routeSet = new Map<string, { tested: boolean; hasIssues: boolean }>();
    for (const f of findings) {
      const existing = routeSet.get(f.route);
      if (!existing) {
        routeSet.set(f.route, { tested: true, hasIssues: f.result === "fail" });
      } else if (f.result === "fail") {
        existing.hasIssues = true;
      }
    }
    const coverageMap = Array.from(routeSet.entries()).map(([route, data]) => ({
      route,
      ...data,
    }));

    // Parse AI analysis if present
    let aiAnalysis = null;
    if (run.ai_analysis) {
      try { aiAnalysis = JSON.parse(run.ai_analysis); } catch { /* invalid json */ }
    }

    return NextResponse.json({
      ok: true,
      run: {
        id: run.id,
        sandboxId: run.sandbox_id,
        status: run.status,
        createdAt: Number(run.created_at),
        finishedAt: run.finished_at ? Number(run.finished_at) : null,
        totalRoutes: run.total_routes,
        overallScore: run.overall_score,
        criticalCount: run.critical_count,
        highCount: run.high_count,
        mediumCount: run.medium_count,
        lowCount: run.low_count,
        summary: run.summary,
      },
      aiAnalysis,
      findings: findings.map((f) => ({
        route: f.route,
        checkType: f.check_type,
        result: f.result,
        severity: f.severity,
        details: f.details,
        payload: f.payload,
      })),
      coverageMap,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
