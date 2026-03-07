/**
 * AI Analysis Agent — uses Groq (Llama) to analyze security scan results
 * and generate actionable recommendations.
 *
 * AI is used ONLY here — everything else is deterministic.
 * Cost stays low: single small-model call per full scan.
 */

import type { SecurityReport } from "./result-collector";

export interface AiAnalysis {
  summary: string;
  riskLevel: "Critical" | "High" | "Medium" | "Low" | "Minimal";
  criticalFindings: string[];
  recommendations: string[];
  attackReplay: string[];      // curl commands to replicate issues
}

/**
 * Summarise the security report via Groq AI.
 * Falls back to a deterministic summary if GROQ_API_KEY is not set.
 */
export async function analyzeReport(report: SecurityReport): Promise<AiAnalysis> {
  const apiKey = process.env.GROQ_API_KEY;

  // Deterministic fallback
  if (!apiKey) return buildDeterministicAnalysis(report);

  // Build a compact payload to minimise tokens
  const topIssues = report.routeReports
    .flatMap(r => r.security.filter(f => f.result === "fail"))
    .slice(0, 40)
    .map(f => ({ route: f.route, type: f.checkType, severity: f.severity, details: f.details, payload: f.payload }));

  const prompt = `You are a senior application security engineer reviewing automated scan results.

Overall score: ${report.overallScore}/100
Routes scanned: ${report.totalRoutes}
Critical: ${report.criticalCount} | High: ${report.highCount} | Medium: ${report.mediumCount} | Low: ${report.lowCount}

Top findings (JSON):
${JSON.stringify(topIssues, null, 2)}

Respond in JSON (no markdown) with this exact shape:
{
  "summary": "2-3 sentence executive summary",
  "riskLevel": "Critical|High|Medium|Low|Minimal",
  "criticalFindings": ["finding 1", "finding 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "attackReplay": ["curl command 1 to replicate the most critical finding"]
}

Be specific: reference exact routes and vulnerability types. Keep it concise.`;

  try {
    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AiAnalysis;
    }
  } catch { /* AI failed — use fallback */ }

  return buildDeterministicAnalysis(report);
}

function buildDeterministicAnalysis(report: SecurityReport): AiAnalysis {
  const riskLevel: AiAnalysis["riskLevel"] =
    report.criticalCount > 0 ? "Critical" :
    report.highCount > 0 ? "High" :
    report.mediumCount > 0 ? "Medium" :
    report.lowCount > 0 ? "Low" : "Minimal";

  const criticals = report.routeReports
    .flatMap(r => r.security.filter(f => f.result === "fail" && (f.severity === "critical" || f.severity === "high")))
    .slice(0, 5)
    .map(f => `${f.checkType} on ${f.route}: ${f.details}`);

  const recs: string[] = [];
  if (report.criticalCount > 0) recs.push("Immediately patch critical vulnerabilities (SQL injection, XSS)");
  if (report.highCount > 0) recs.push("Add authentication checks and security headers to all API routes");
  if (report.mediumCount > 0) recs.push("Implement rate limiting and CORS policies");
  if (recs.length === 0) recs.push("Continue monitoring — no urgent issues found");

  return {
    summary: `Scanned ${report.totalRoutes} routes. Score: ${report.overallScore}/100. Found ${report.totalFindings} issues (${report.criticalCount} critical, ${report.highCount} high).`,
    riskLevel,
    criticalFindings: criticals,
    recommendations: recs,
    attackReplay: [],
  };
}
