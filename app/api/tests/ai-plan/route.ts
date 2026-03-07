/**
 * POST /api/tests/ai-plan
 * Uses the AI Security Testing Agent prompt to analyse discovered API routes
 * and generate a comprehensive test plan (api, security, performance, vibetest).
 * Body: { sandboxId: string }
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseApiRoutes } from "@/lib/route-parser";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an autonomous API Security Testing Agent.

Your job is to plan and orchestrate tests for APIs of a web application.

You DO NOT execute the requests.
You ONLY generate structured testing tasks that another system will run.

The system supports these testing modules:
1. API Testing
2. Security Scans
3. Performance Testing
4. Vibetest (robustness testing)

Your responsibilities:
1. Analyze API endpoints
2. Identify potential vulnerabilities
3. Generate attack payloads
4. Plan load tests
5. Create edge case inputs
6. Prioritize security risks

RULES:
- Do not generate more than 5 tests per category
- Prioritize critical vulnerabilities
- Do not repeat payloads
- Return only valid JSON

OUTPUT FORMAT:
{
  "routes": [
    {
      "endpoint": "/api/login",
      "method": "POST",
      "risk_level": "critical|high|medium|low",
      "tests": {
        "api_testing": [
          { "name": "valid_request", "payload": {} }
        ],
        "security_scans": [
          { "type": "sql_injection", "payload": {}, "description": "..." }
        ],
        "performance": [
          { "type": "load_test", "concurrency": 50, "requests": 500 }
        ],
        "vibetest": [
          { "type": "large_payload", "payload": {}, "description": "..." }
        ]
      }
    }
  ],
  "summary": {
    "total_routes": 0,
    "critical_routes": 0,
    "total_tests": 0,
    "top_risks": []
  }
}`;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { sandboxId } = (await request.json()) as { sandboxId?: string };
    if (!sandboxId) {
      return NextResponse.json({ ok: false, error: "sandboxId is required" }, { status: 400 });
    }

    // Discover routes
    const routes = await parseApiRoutes(sandboxId);
    if (routes.length === 0) {
      return NextResponse.json({ ok: false, error: "No API routes found in this deployment" }, { status: 404 });
    }

    const routeList = routes
      .map((r) => `- ${r} (methods: GET, POST, PUT, DELETE, PATCH)`)
      .join("\n");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyse these API routes and generate a comprehensive security test plan:\n\nAPI Routes:\n${routeList}\n\nReturn the full JSON test plan.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let plan: unknown;
    try {
      plan = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false, error: "AI returned invalid JSON" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, plan, routes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
