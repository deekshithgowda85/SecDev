/**
 * GET /api/dashboard/stats
 *
 * Returns aggregated stats for the authenticated user's dashboard:
 *   - Total deployments (live + all)
 *   - Test run counts (total, completed, failed, by type)
 *   - Recent activity (last 5 runs across all types)
 */

import { NextResponse } from "next/server";
import { getDb, ensureTables } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    await ensureTables();
    const sql = getDb();

    const [deployRows, runRows, agentRows] = await Promise.all([
      // Deployments stats
      sql`
        SELECT status, COUNT(*) AS count
        FROM deployments
        WHERE user_id = ${userId} OR user_id = ''
        GROUP BY status
      `,
      // Test run stats (test_runs table)
      sql`
        SELECT type, status, COUNT(*) AS count
        FROM test_runs
        WHERE user_id = ${userId} OR user_id = ''
        GROUP BY type, status
      `,
      // Security agent run stats
      sql`
        SELECT status, COUNT(*) AS count
        FROM security_agent_runs
        WHERE user_id = ${userId} OR user_id = ''
        GROUP BY status
      `,
    ]);

    // Compute deployment counts
    let totalDeployments = 0;
    let liveDeployments = 0;
    for (const row of deployRows) {
      totalDeployments += Number(row.count);
      if (row.status === "live") liveDeployments += Number(row.count);
    }

    // Compute test run counts
    let totalRuns = 0;
    let passedRuns = 0;
    let failedRuns = 0;
    const byType: Record<string, { total: number; completed: number; failed: number }> = {};
    for (const row of runRows) {
      const n = Number(row.count);
      totalRuns += n;
      if (row.status === "completed") passedRuns += n;
      if (row.status === "failed") failedRuns += n;
      if (!byType[row.type]) byType[row.type] = { total: 0, completed: 0, failed: 0 };
      byType[row.type].total += n;
      if (row.status === "completed") byType[row.type].completed += n;
      if (row.status === "failed") byType[row.type].failed += n;
    }

    // Security agent totals
    let agentTotal = 0;
    let agentCompleted = 0;
    for (const row of agentRows) {
      agentTotal += Number(row.count);
      if (row.status === "completed") agentCompleted += Number(row.count);
    }

    // Recent activity: last 8 runs (across all tables)
    const recent = await sql`
      SELECT id, sandbox_id, type, status, created_at, finished_at, summary
      FROM test_runs
      WHERE user_id = ${userId} OR user_id = ''
      ORDER BY created_at DESC
      LIMIT 8
    `;

    return NextResponse.json({
      ok: true,
      deployments: { total: totalDeployments, live: liveDeployments },
      runs: { total: totalRuns, completed: passedRuns, failed: failedRuns, byType },
      securityAgent: { total: agentTotal, completed: agentCompleted },
      recent: recent.map((r) => ({
        id: r.id,
        sandboxId: r.sandbox_id,
        type: r.type,
        status: r.status,
        createdAt: Number(r.created_at),
        finishedAt: r.finished_at ? Number(r.finished_at) : null,
        summary: r.summary,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
