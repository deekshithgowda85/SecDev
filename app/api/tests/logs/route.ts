/**
 * GET /api/tests/logs?runId=xxx&after=0
 * Returns log lines for a test run, optionally only those with id > after.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");
    const after = parseInt(searchParams.get("after") ?? "0", 10);

    if (!runId) {
      return NextResponse.json({ ok: false, error: "runId is required" }, { status: 400 });
    }

    const sql = getDb();

    // Verify run belongs to user
    const run = await sql`
      SELECT id FROM test_runs WHERE id = ${runId} AND user_id = ${session.user.id} LIMIT 1
    `;
    if (run.length === 0) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const logs = await sql`
      SELECT id, level, message, created_at
      FROM run_logs
      WHERE run_id = ${runId} AND id > ${after}
      ORDER BY id ASC
      LIMIT 200
    `;

    return NextResponse.json({ ok: true, logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
