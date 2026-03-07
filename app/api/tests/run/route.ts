/**
 * POST /api/tests/run  — Trigger a test run via Inngest
 * Body: { sandboxId: string; type: "suite" | "security" | "api" | "performance" }
 *
 * GET /api/tests/run  — List all test runs (optionally filter by sandboxId or type)
 * Query: ?sandboxId=xxx&type=suite
 */

import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";
import { getDb, ensureTables } from "@/lib/db";
import { randomBytes } from "node:crypto";

const EVENT_MAP: Record<string, string> = {
  suite: "test/suite.run",
  security: "test/security.run",
  api: "test/api.run",
  performance: "test/performance.run",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sandboxId, type } = body as { sandboxId?: string; type?: string };

    if (!sandboxId || !type) {
      return NextResponse.json({ ok: false, error: "sandboxId and type are required" }, { status: 400 });
    }

    const eventName = EVENT_MAP[type];
    if (!eventName) {
      return NextResponse.json(
        { ok: false, error: `Invalid type. Use: ${Object.keys(EVENT_MAP).join(", ")}` },
        { status: 400 }
      );
    }

    const runId = `run_${randomBytes(8).toString("hex")}`;

    // Create the test run record
    await ensureTables();
    const sql = getDb();
    await sql`
      INSERT INTO test_runs (id, sandbox_id, type, status, created_at)
      VALUES (${runId}, ${sandboxId}, ${type}, 'running', ${Date.now()})
    `;

    // Send the Inngest event
    await inngest.send({
      name: eventName,
      data: { runId, sandboxId },
    });

    return NextResponse.json({ ok: true, runId, type, sandboxId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await ensureTables();
    const sql = getDb();
    const { searchParams } = new URL(request.url);
    const sandboxId = searchParams.get("sandboxId");
    const type = searchParams.get("type");

    let rows;
    if (sandboxId && type) {
      rows = await sql`SELECT * FROM test_runs WHERE sandbox_id = ${sandboxId} AND type = ${type} ORDER BY created_at DESC`;
    } else if (sandboxId) {
      rows = await sql`SELECT * FROM test_runs WHERE sandbox_id = ${sandboxId} ORDER BY created_at DESC`;
    } else if (type) {
      rows = await sql`SELECT * FROM test_runs WHERE type = ${type} ORDER BY created_at DESC`;
    } else {
      rows = await sql`SELECT * FROM test_runs ORDER BY created_at DESC LIMIT 100`;
    }

    return NextResponse.json({
      ok: true,
      runs: rows.map((r) => ({
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
