/**
 * POST /api/tests/analyze — Optional Groq AI analysis of test results.
 * Body: { runId: string }
 *
 * Uses Groq (lightweight, fast) to summarize test results into actionable insights.
 * Only works if GROQ_API_KEY is set — if not, returns a graceful "not configured" message.
 */

import { NextResponse } from "next/server";
import { getDb, ensureTables } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        analysis: "AI analysis is not configured. Set GROQ_API_KEY to enable this feature.",
        configured: false,
      });
    }

    const body = await request.json();
    const { runId } = body as { runId?: string };

    if (!runId) {
      return NextResponse.json({ ok: false, error: "runId is required" }, { status: 400 });
    }

    await ensureTables();
    const sql = getDb();

    // Get run info
    const runRows = await sql`SELECT * FROM test_runs WHERE id = ${runId}`;
    if (!runRows.length) {
      return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
    }
    const run = runRows[0];

    // Get results based on type
    let results;
    switch (run.type) {
      case "suite":
        results = await sql`SELECT route, status, status_code, response_time, error FROM test_results WHERE run_id = ${runId}`;
        break;
      case "security":
        results = await sql`SELECT route, check_type, result, details, severity FROM security_results WHERE run_id = ${runId}`;
        break;
      case "api":
        results = await sql`SELECT endpoint, method, status, status_code, latency FROM api_test_results WHERE run_id = ${runId}`;
        break;
      case "performance":
        results = await sql`SELECT route, avg_response, max_response, min_response, success_rate FROM performance_results WHERE run_id = ${runId}`;
        break;
      default:
        return NextResponse.json({ ok: false, error: "Unknown test type" }, { status: 400 });
    }

    // Build prompt
    const resultsSummary = JSON.stringify(results.slice(0, 50), null, 2);
    const prompt = `You are a DevOps expert analyzing test results for a deployed web application.

Test type: ${run.type}
Summary: ${run.summary ?? "N/A"}
Results (up to 50):
${resultsSummary}

Provide a concise analysis (max 300 words):
1. Key findings and critical issues
2. Specific recommendations to fix problems
3. Overall health assessment (Good / Needs Attention / Critical)

Be specific, actionable, and concise.`;

    // Call Groq API
    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
    });

    const analysis = completion.choices[0]?.message?.content ?? "No analysis generated.";

    return NextResponse.json({ ok: true, analysis, configured: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
