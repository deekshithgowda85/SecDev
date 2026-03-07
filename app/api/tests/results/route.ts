/**
 * GET /api/tests/results?runId=xxx&type=suite
 *
 * Fetch test results for a specific run, filtering by test type.
 */

import { NextResponse } from "next/server";
import { getDb, ensureTables } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await ensureTables();
    const sql = getDb();
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");
    const type = searchParams.get("type");

    if (!runId) {
      return NextResponse.json({ ok: false, error: "runId is required" }, { status: 400 });
    }

    // Get the run info
    const runRows = await sql`SELECT * FROM test_runs WHERE id = ${runId}`;
    if (!runRows.length) {
      return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
    }
    const run = runRows[0];
    const testType = type ?? run.type;

    let results;
    switch (testType) {
      case "suite":
        results = await sql`SELECT * FROM test_results WHERE run_id = ${runId} ORDER BY created_at ASC`;
        break;
      case "security":
        results = await sql`SELECT * FROM security_results WHERE run_id = ${runId} ORDER BY created_at ASC`;
        break;
      case "api":
        results = await sql`SELECT * FROM api_test_results WHERE run_id = ${runId} ORDER BY created_at ASC`;
        break;
      case "performance":
        results = await sql`SELECT * FROM performance_results WHERE run_id = ${runId} ORDER BY created_at ASC`;
        break;
      case "vibetest":
        results = await sql`SELECT * FROM vibetest_results WHERE run_id = ${runId} ORDER BY created_at ASC`;
        break;
      default:
        return NextResponse.json({ ok: false, error: "Unknown test type" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      run: {
        id: run.id,
        sandboxId: run.sandbox_id,
        type: run.type,
        status: run.status,
        createdAt: Number(run.created_at),
        finishedAt: run.finished_at ? Number(run.finished_at) : null,
        summary: run.summary,
      },
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
