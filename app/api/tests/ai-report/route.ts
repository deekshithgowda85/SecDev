/**
 * POST /api/tests/ai-report
 *
 * Generates a comprehensive AI security report using Groq
 * from the combined results of all 5 test layers.
 *
 * Body: { runIds: Record<string, string> }
 *   e.g. { "suite": "run_abc", "api": "run_def", ... }
 */

import { NextResponse } from "next/server";
import { getDb, ensureTables } from "@/lib/db";
import { auth } from "@/lib/auth";

const TYPE_TABLES: Record<string, { table: string; cols: string }> = {
  suite:       { table: "test_results",       cols: "route, status, status_code, response_time, error" },
  api:         { table: "api_test_results",   cols: "endpoint, method, status, status_code, latency" },
  security:    { table: "security_results",   cols: "route, check_type, result, details, severity" },
  performance: { table: "performance_results", cols: "route, avg_response, max_response, min_response, success_rate" },
  vibetest:    { table: "vibetest_results",   cols: "agent, category, status, finding, detail, url" },
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        report: "## AI Report Unavailable\n\nSet `GROQ_API_KEY` environment variable to enable AI-powered security reports.",
        configured: false,
      });
    }

    const body = await request.json();
    const { runIds } = body as { runIds?: Record<string, string> };

    if (!runIds || typeof runIds !== "object" || Object.keys(runIds).length === 0) {
      return NextResponse.json({ ok: false, error: "runIds map is required" }, { status: 400 });
    }

    await ensureTables();
    const sql = getDb();

    // Gather summaries + result snippets for each layer
    const sections: string[] = [];

    for (const [type, runId] of Object.entries(runIds)) {
      if (!runId) continue;

      // Verify ownership
      const runRow = await sql`SELECT * FROM test_runs WHERE id = ${runId} AND user_id = ${session.user.id}`;
      if (runRow.length === 0) continue;

      const run = runRow[0];
      const cfg = TYPE_TABLES[type];
      if (!cfg) continue;

      // Dynamic query — cols are hardcoded above, not user input
      let results;
      switch (type) {
        case "suite":
          results = await sql`SELECT route, status, status_code, response_time, error FROM test_results WHERE run_id = ${runId} ORDER BY created_at ASC LIMIT 60`;
          break;
        case "api":
          results = await sql`SELECT endpoint, method, status, status_code, latency FROM api_test_results WHERE run_id = ${runId} ORDER BY created_at ASC LIMIT 60`;
          break;
        case "security":
          results = await sql`SELECT route, check_type, result, details, severity FROM security_results WHERE run_id = ${runId} ORDER BY created_at ASC LIMIT 60`;
          break;
        case "performance":
          results = await sql`SELECT route, avg_response, max_response, min_response, success_rate FROM performance_results WHERE run_id = ${runId} ORDER BY created_at ASC LIMIT 60`;
          break;
        case "vibetest":
          results = await sql`SELECT agent, category, status, finding, detail, url FROM vibetest_results WHERE run_id = ${runId} ORDER BY created_at ASC LIMIT 60`;
          break;
        default:
          continue;
      }

      sections.push(
        `### Layer: ${type.toUpperCase()}\nRun ID: ${run.id}\nStatus: ${run.status}\nSummary: ${run.summary ?? "N/A"}\nResults (${results.length} rows):\n${JSON.stringify(results.slice(0, 30), null, 2)}`
      );
    }

    if (sections.length === 0) {
      return NextResponse.json({ ok: false, error: "No valid runs found" }, { status: 404 });
    }

    const prompt = `You are a senior DevSecOps engineer reviewing the results of a comprehensive automated security test suite run against a deployed web application. The test suite has up to 5 layers: Route Health (HTTP checks), API Testing (endpoint validation), Security Scan (OWASP headers, XSS, cookies), Performance (load testing), and Vibetest (browser-based link crawling, console errors, accessibility).

Here are the combined results from all layers:

${sections.join("\n\n")}

Generate a structured Markdown security report with these sections:

# 🛡️ Security Test Report

## Executive Summary
A 2-3 sentence overview of the overall security posture. Include an overall grade (A/B/C/D/F) and overall risk level (Low/Medium/High/Critical).

## Findings by Severity

### 🔴 Critical Issues
List any critical vulnerabilities found (XSS, missing security headers, exposed server info, broken routes). For each, include: what was found, which route/endpoint, and why it matters.

### 🟠 High Priority
Issues that should be fixed soon.

### 🟡 Medium Priority
Issues that aren't urgent but should be addressed.

### 🟢 Passed Checks
A brief summary of what passed successfully.

## Recommended Fixes
For each critical and high issue, provide a specific, actionable fix with code examples where appropriate (e.g., adding security headers in Next.js middleware, fixing CORS configuration, etc).

## Performance Overview
Summarize response times, any slow routes, and load test results if available.

## Action Items
A numbered checklist of the top 10 most important things to fix, ordered by priority.

Be specific, reference actual routes and findings from the data. Use markdown formatting with headers, bullet points, code blocks, and bold text for emphasis. Do NOT make up findings that aren't in the data.`;

    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
      temperature: 0.2,
    });

    const report = completion.choices[0]?.message?.content ?? "No report generated.";

    return NextResponse.json({ ok: true, report, configured: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
