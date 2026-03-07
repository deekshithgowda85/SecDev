/**
 * POST /api/tests/stop — Cancel a running test run
 * Body: { runId: string }
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const { runId } = (await request.json()) as { runId?: string };
    if (!runId) {
      return NextResponse.json({ ok: false, error: "runId is required" }, { status: 400 });
    }

    const sql = getDb();
    // Only allow cancelling the user's own running runs
    const result = await sql`
      UPDATE test_runs
      SET status = 'failed', finished_at = ${Date.now()}, summary = 'Cancelled by user'
      WHERE id = ${runId}
        AND user_id = ${session.user.id}
        AND status = 'running'
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ ok: false, error: "Run not found or already finished" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, runId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
