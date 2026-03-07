/**
 * POST /api/security-agent/run  — Trigger a full security agent scan
 * Body: { sandboxId: string }
 *
 * GET  /api/security-agent/run  — List security agent runs
 * Query: ?sandboxId=xxx
 */

import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";
import { getDb, ensureTables } from "@/lib/db";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await request.json();
    const { sandboxId } = body as { sandboxId?: string };

    if (!sandboxId) {
      return NextResponse.json({ ok: false, error: "sandboxId is required" }, { status: 400 });
    }

    await ensureTables();
    const sql = getDb();

    // Verify sandbox ownership
    const dep = await sql`SELECT user_id FROM deployments WHERE sandbox_id = ${sandboxId} LIMIT 1`;
    if (dep.length > 0 && dep[0].user_id && dep[0].user_id !== userId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const runId = `sa_${randomBytes(8).toString("hex")}`;

    await sql`
      INSERT INTO security_agent_runs (id, sandbox_id, user_id, status, created_at)
      VALUES (${runId}, ${sandboxId}, ${userId}, 'running', ${Date.now()})
    `;

    await inngest.send({
      name: "security-agent/scan.run",
      data: { runId, sandboxId },
    });

    return NextResponse.json({ ok: true, runId, sandboxId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

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
    const sandboxId = searchParams.get("sandboxId");

    let rows;
    if (sandboxId) {
      rows = await sql`
        SELECT * FROM security_agent_runs
        WHERE sandbox_id = ${sandboxId} AND (user_id = ${userId} OR user_id = '')
        ORDER BY created_at DESC
      `;
    } else {
      rows = await sql`
        SELECT * FROM security_agent_runs
        WHERE (user_id = ${userId} OR user_id = '')
        ORDER BY created_at DESC LIMIT 50
      `;
    }

    return NextResponse.json({
      ok: true,
      runs: rows.map((r) => ({
        id: r.id,
        sandboxId: r.sandbox_id,
        status: r.status,
        createdAt: Number(r.created_at),
        finishedAt: r.finished_at ? Number(r.finished_at) : null,
        totalRoutes: r.total_routes,
        overallScore: r.overall_score,
        criticalCount: r.critical_count,
        highCount: r.high_count,
        mediumCount: r.medium_count,
        lowCount: r.low_count,
        summary: r.summary,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
