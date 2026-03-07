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
import { auth } from "@/lib/auth";

const EVENT_MAP: Record<string, string> = {
  suite: "test/suite.run",
  security: "test/security.run",
  api: "test/api.run",
  performance: "test/performance.run",
  vibetest: "test/vibetest.run",
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
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

    // Verify that the sandbox belongs to the requesting user
    await ensureTables();
    const sql = getDb();
    const dep = await sql`SELECT user_id FROM deployments WHERE sandbox_id = ${sandboxId} LIMIT 1`;
    if (dep.length > 0 && dep[0].user_id && dep[0].user_id !== userId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const runId = `run_${randomBytes(8).toString("hex")}`;

    await sql`
      INSERT INTO test_runs (id, sandbox_id, type, status, created_at, user_id)
      VALUES (${runId}, ${sandboxId}, ${type}, 'running', ${Date.now()}, ${userId})
    `;

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    await ensureTables();
    const sql = getDb();
    const { searchParams } = new URL(request.url);
    const sandboxId = searchParams.get("sandboxId");
    const type = searchParams.get("type");

    let rows;
    if (sandboxId && type) {
      rows = await sql`SELECT * FROM test_runs WHERE sandbox_id = ${sandboxId} AND type = ${type} AND (user_id = ${userId} OR user_id = '') ORDER BY created_at DESC`;
    } else if (sandboxId) {
      rows = await sql`SELECT * FROM test_runs WHERE sandbox_id = ${sandboxId} AND (user_id = ${userId} OR user_id = '') ORDER BY created_at DESC`;
    } else if (type) {
      rows = await sql`SELECT * FROM test_runs WHERE type = ${type} AND (user_id = ${userId} OR user_id = '') ORDER BY created_at DESC`;
    } else {
      rows = await sql`SELECT * FROM test_runs WHERE (user_id = ${userId} OR user_id = '') ORDER BY created_at DESC LIMIT 100`;
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
