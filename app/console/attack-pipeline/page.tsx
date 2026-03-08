"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Swords, Play, Square, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Loader2, ExternalLink, ChevronDown, ChevronUp, Terminal,
  ShieldAlert, Activity, Sparkles, Copy, Check, Info,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Deployment {
  sandboxId: string;
  repoName: string;
  repoUrl: string;
  status: string;
  publicUrl: string;
}

interface RunMeta {
  id: string;
  baseUrl: string;
  sandboxId: string | null;
  status: string;
  createdAt: number;
  finishedAt: number | null;
  routesFound: number | null;
  overallScore: number | null;
  riskLevel: string | null;
  criticalCount: number | null;
  highCount: number | null;
  mediumCount: number | null;
  lowCount: number | null;
  passedCount: number | null;
  summary: string | null;
}

interface Finding {
  id: string;
  route: string;
  agent: string;
  checkType: string;
  severity: string;
  result: string;
  details: string;
  payload?: string | null;
  curlReplay?: string | null;
  remediation?: string | null;
}

interface CoverageEntry { route: string; tested: boolean; hasIssues: boolean; }

interface VibeFinding {
  route: string;
  testCase: string;
  payload: string;
  statusCode: number;
  evidence: string;
  severity: string;
  checkType: string;
}

interface PerfRoute {
  route: string;
  avgLatency: number;
  p95Latency: number;
  successRate: number;
  requestsPerSecond: number;
  status: string;
}

interface AiAnalysis {
  summary: string;
  riskLevel: string;
  criticalFindings: string[];
  recommendations: string[];
  attackReplay: string[];
}

interface Report {
  scanId: string;
  baseUrl: string;
  scannedAt: string;
  durationMs: number;
  framework: string;
  routesDiscovered: number;
  overallScore: number;
  riskLevel: string;
  summary: { critical: number; high: number; medium: number; low: number; passed: number };
  findings: Finding[];
  vibetest: VibeFinding[];
  coverage: CoverageEntry[];
  performance?: { routes: PerfRoute[]; avgScoreAcrossRoutes: number; slowestRoute: string | null };
  aiAnalysis: AiAnalysis;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-300 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  high:     "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30",
  medium:   "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30",
  low:      "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  info:     "bg-gray-100 text-gray-600 border-gray-300 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-600",
};

const RISK_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40",
  high:     "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/40",
  medium:   "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/40",
  low:      "bg-green-100 text-green-800 border-green-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/40",
  minimal:  "bg-green-100 text-green-800 border-green-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/40",
};

const AGENT_BADGE: Record<string, string> = {
  "sql-injection": "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  "auth-bypass":   "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
  "injection":     "bg-gray-50 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  "parameter":     "bg-gray-50 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  "headers":       "bg-gray-50 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

function scoreColor(score: number | null): string {
  if (score === null) return "text-gray-400 dark:text-zinc-500";
  if (score >= 85) return "text-green-600 dark:text-green-400";
  if (score >= 65) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 45) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function ScoreGauge({ score }: { score: number }) {
  const angle = (score / 100) * 180;
  const color = score >= 85 ? "#22c55e" : score >= 65 ? "#eab308" : score >= 45 ? "#f97316" : "#ef4444";
  const r = 54;
  const cx = 64;
  const cy = 64;
  // Start at 180° (left), sweep clockwise to angle
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const sx = cx + r * Math.cos(toRad(180));
  const sy = cy + r * Math.sin(toRad(180));
  const ex = cx + r * Math.cos(toRad(180 - angle));
  const ey = cy + r * Math.sin(toRad(180 - angle));
  const large = angle > 90 ? 1 : 0;
  return (
    <div className="flex flex-col items-center">
      <svg width="128" height="72" viewBox="0 0 128 72">
        {/* Track */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round"
          className="dark:stroke-zinc-700" />
        {/* Fill */}
        {score > 0 && (
          <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${large} 0 ${ex} ${ey}`}
            fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
        )}
      </svg>
      <div className={`-mt-8 text-3xl font-bold ${scoreColor(score)}`}>{score}</div>
      <div className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">/ 100</div>
    </div>
  );
}

function CurlCopy({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(cmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <button onClick={copy} className="ml-2 shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors" title="Copy curl command">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function FindingRow({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false);
  if (f.result === "pass") return null; // only show failures
  return (
    <div className="border-b border-gray-100 dark:border-zinc-800 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border uppercase tracking-wide ${SEVERITY_BADGE[f.severity] ?? SEVERITY_BADGE.info}`}>
          {f.severity}
        </span>
        <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${AGENT_BADGE[f.agent] ?? AGENT_BADGE.headers}`}>
          {f.agent}
        </span>
        <span className="font-mono text-xs text-gray-600 dark:text-zinc-400 truncate max-w-[12rem]">{f.route}</span>
        <span className="text-xs text-gray-500 dark:text-zinc-500 truncate flex-1">{f.checkType}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2 bg-gray-50/50 dark:bg-zinc-800/30">
          <p className="text-sm text-gray-700 dark:text-zinc-300">{f.details}</p>
          {f.payload && (
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Payload</span>
              <pre className="mt-1 text-xs bg-gray-100 dark:bg-zinc-900 rounded px-3 py-2 overflow-x-auto text-gray-800 dark:text-zinc-200 whitespace-pre-wrap break-all">{f.payload}</pre>
            </div>
          )}
          {f.curlReplay && (
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Reproduce</span>
              <div className="mt-1 flex items-start gap-1">
                <pre className="flex-1 text-xs bg-zinc-900 dark:bg-black text-green-400 rounded px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">{f.curlReplay}</pre>
                <CurlCopy cmd={f.curlReplay} />
              </div>
            </div>
          )}
          {f.remediation && (
            <div className="flex items-start gap-2 p-2 rounded bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
              <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">{f.remediation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AttackPipelinePage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedSandbox, setSelectedSandbox] = useState<string>("");
  const [customUrl, setCustomUrl] = useState<string>("");
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [includePerf, setIncludePerf] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunMeta[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set(["sql-injection", "auth-bypass"]));
  const [activeTab, setActiveTab] = useState<"findings" | "vibetest" | "coverage" | "performance">("findings");
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const currentRunIdRef = useRef<string | null>(null);

  const selectedDeployment = deployments.find((d) => d.sandboxId === selectedSandbox);
  const targetUrl = useCustomUrl ? customUrl.trim() : (selectedDeployment?.publicUrl ?? "");

  // Load deployments
  useEffect(() => {
    fetch("/api/deploy")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const all = (d.deployments ?? []).filter((dep: Deployment) => dep.status !== "failed");
          setDeployments(all);
          if (all.length > 0) setSelectedSandbox(all[0].sandboxId);
        }
      })
      .catch(() => null);
  }, []);

  // Load run history (used for manual refresh buttons and post-scan callbacks)
  const fetchRuns = useCallback(async () => {
    setRunsLoading(true);
    try {
      const res = await fetch("/api/attack-pipeline");
      const data = await res.json();
      if (data.ok) setRuns(data.runs ?? []);
    } catch { /* ignore */ }
    setRunsLoading(false);
  }, []);

  // Initial load — use Promise callbacks so setState is never called synchronously in the effect body
  useEffect(() => {
    let active = true;
    fetch("/api/attack-pipeline")
      .then((r) => r.json())
      .then((data) => { if (active && data.ok) setRuns(data.runs ?? []); })
      .catch(() => null)
      .finally(() => { if (active) setRunsLoading(false); });
    return () => { active = false; };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const loadReport = async (runId: string) => {
    try {
      const res = await fetch(`/api/attack-pipeline/report?runId=${runId}`);
      const data = await res.json();
      if (data.ok && data.report) {
        setReport(data.report as Report);
        setLogs([]);
        setError(null);
      }
    } catch { /* ignore */ }
  };

  const handleStop = async () => {
    abortRef.current?.abort();
    setLogs((prev) => [...prev, "⚠ Scan stopped by user."]);
    setScanning(false);
    const runId = currentRunIdRef.current;
    if (runId) {
      await fetch("/api/attack-pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      }).catch(() => null);
      currentRunIdRef.current = null;
      fetchRuns();
    }
  };

  const handleRun = async () => {
    if (!targetUrl) { setError("Enter a target URL or select a deployment."); return; }
    if (!targetUrl.startsWith("http")) { setError("URL must start with http:// or https://"); return; }
    setError(null);
    setReport(null);
    setLogs([]);
    setScanning(true);
    currentRunIdRef.current = null;
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/attack-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          baseUrl: targetUrl,
          sandboxId: useCustomUrl ? undefined : selectedSandbox || undefined,
          useAi,
          includePerformance: includePerf,
        }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        setError((errData as { error?: string }).error ?? "Failed to start scan");
        setScanning(false);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(part.slice(6)) as {
              type: string; msg?: string; report?: Report; error?: string; runId?: string;
            };
            if (ev.type === "start" && ev.runId) {
              currentRunIdRef.current = ev.runId;
            } else if (ev.type === "progress" && ev.msg) {
              setLogs((prev) => [...prev, ev.msg!]);
            } else if (ev.type === "complete" && ev.report) {
              setReport(ev.report);
              setLogs((prev) => [...prev, "✓ Scan complete."]);
              fetchRuns();
            } else if (ev.type === "error") {
              setError(ev.error ?? "Scan failed");
              setLogs((prev) => [...prev, `✗ Error: ${ev.error}`]);
              fetchRuns();
            }
          } catch { /* malformed event */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Stopped by user — already handled in handleStop
      } else {
        setError(err instanceof Error ? err.message : "Network error");
      }
    }
    setScanning(false);
  };

  const toggleAgent = (agent: string) =>
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agent)) next.delete(agent); else next.add(agent);
      return next;
    });

  // Group findings by agent
  const failedFindings = report?.findings.filter((f) => f.result === "fail") ?? [];
  const agentGroups = [...new Set(failedFindings.map((f) => f.agent))];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Swords className="w-6 h-6 text-red-500" /> Attack Pipeline
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Modular AI-assisted pen-test: SQL injection · Auth bypass · Command injection · Parameter manipulation · Performance
        </p>
      </div>

      {/* Config panel */}
      <div className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
        {/* Target selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
            Target
          </label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setUseCustomUrl(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${!useCustomUrl ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent" : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:border-gray-400"}`}
            >
              Deployment
            </button>
            <button
              onClick={() => setUseCustomUrl(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${useCustomUrl ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent" : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:border-gray-400"}`}
            >
              Custom URL
            </button>
          </div>

          {!useCustomUrl ? (
            deployments.length === 0 ? (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                No deployments found.{" "}
                <Link href="/console/deployments" className="underline">Deploy a project</Link> first.
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <select
                  value={selectedSandbox}
                  onChange={(e) => setSelectedSandbox(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                >
                  {deployments.map((d) => (
                    <option key={d.sandboxId} value={d.sandboxId}>
                      [{d.status.toUpperCase()}] {d.repoName} — {d.publicUrl}
                    </option>
                  ))}
                </select>
                {selectedDeployment && (
                  <a href={selectedDeployment.publicUrl} target="_blank" rel="noopener noreferrer"
                    className="text-gray-600 dark:text-zinc-400 hover:underline">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )
          ) : (
            <input
              type="url"
              placeholder="https://your-app.example.com"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />
          )}
        </div>

        {/* Options row */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)}
              className="w-4 h-4 rounded accent-gray-900 dark:accent-white" />
            <span className="text-sm text-gray-700 dark:text-zinc-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" /> AI Analysis (Groq)
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={includePerf} onChange={(e) => setIncludePerf(e.target.checked)}
              className="w-4 h-4 rounded accent-gray-900 dark:accent-white" />
            <span className="text-sm text-gray-700 dark:text-zinc-300 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" /> Performance Test
            </span>
          </label>

          <div className="flex-1" />

          {scanning ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={!targetUrl}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Run Attack
            </button>
          )}

          <button onClick={fetchRuns} disabled={runsLoading} title="Refresh history"
            className="flex items-center justify-center w-9 h-9 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-zinc-400 ${runsLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Live terminal */}
      {(scanning || logs.length > 0) && (
        <div className="mb-6 rounded-xl border border-gray-200 dark:border-zinc-800 bg-zinc-950 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-800">
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-400">Live output</span>
            {scanning && <Loader2 className="w-3 h-3 text-yellow-400 animate-spin ml-auto" />}
          </div>
          <div className="h-56 overflow-y-auto px-4 py-3 font-mono text-xs text-green-400 space-y-0.5">
            {logs.map((line, i) => (
              <div key={i} className="leading-5">{line}</div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* ── Report ── */}
      {report && (
        <div className="mb-8 space-y-6">
          {/* Score + summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Gauge */}
            <div className="sm:col-span-1 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center gap-2">
              <ScoreGauge score={report.overallScore} />
              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${RISK_BADGE[(report.riskLevel ?? "").toLowerCase()] ?? RISK_BADGE.low}`}>
                {report.riskLevel} Risk
              </span>
              <p className="text-xs text-gray-400 dark:text-zinc-500 text-center">
                {report.routesDiscovered} routes · {Math.round(report.durationMs / 1000)}s · {report.framework}
              </p>
            </div>

            {/* Counts */}
            <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Critical", count: report.summary.critical, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
                { label: "High",     count: report.summary.high,     color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20" },
                { label: "Medium",   count: report.summary.medium,   color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20" },
                { label: "Low",      count: report.summary.low,      color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" },
                { label: "Passed",   count: report.summary.passed,   color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20" },
                { label: "Total",    count: report.findings.length,  color: "text-gray-700 dark:text-zinc-300", bg: "bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700" },
              ].map(({ label, count, color, bg }) => (
                <div key={label} className={`p-4 rounded-xl border ${bg}`}>
                  <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${color}`}>{count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis */}
          {report.aiAnalysis && (
            <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/30">
              <h3 className="font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4" /> AI Analysis
              </h3>
              <p className="text-sm text-gray-700 dark:text-zinc-300 mb-3">{report.aiAnalysis.summary}</p>
              {report.aiAnalysis.criticalFindings.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-1">Key Findings</p>
                  <ul className="space-y-1">
                    {report.aiAnalysis.criticalFindings.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-zinc-300">
                        <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.aiAnalysis.recommendations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">Recommendations</p>
                  <ul className="space-y-1">
                    {report.aiAnalysis.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-zinc-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div>
            <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg p-1 w-fit mb-4">
              {(["findings", "vibetest", "coverage", "performance"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                    activeTab === tab
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                  }`}>
                  {tab}
                  {tab === "findings" && failedFindings.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-full">{failedFindings.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Findings tab */}
            {activeTab === "findings" && (
              <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                {failedFindings.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 dark:text-zinc-500">
                    <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>No vulnerabilities found.</p>
                  </div>
                ) : (
                  agentGroups.map((agent) => {
                    const group = failedFindings.filter((f) => f.agent === agent);
                    const open = expandedAgents.has(agent);
                    return (
                      <div key={agent} className="border-b border-gray-200 dark:border-zinc-800 last:border-0">
                        <button
                          onClick={() => toggleAgent(agent)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border uppercase ${AGENT_BADGE[agent] ?? AGENT_BADGE.headers}`}>{agent}</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">{group.length} issue{group.length !== 1 ? "s" : ""}</span>
                          </div>
                          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>
                        {open && group.map((f) => <FindingRow key={f.id} f={f} />)}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Vibetest tab */}
            {activeTab === "vibetest" && (
              <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                {(report.vibetest ?? []).length === 0 ? (
                  <div className="py-10 text-center text-gray-400 dark:text-zinc-500">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40 text-green-500" />
                    <p>All fuzz tests passed.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800">
                        {["Route", "Test Case", "Status", "Evidence"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                      {report.vibetest.map((v, i) => (
                        <tr key={i} className="bg-white dark:bg-zinc-900">
                          <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-zinc-400">{v.route}</td>
                          <td className="px-4 py-3 text-xs">{v.testCase}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${SEVERITY_BADGE[v.severity] ?? SEVERITY_BADGE.info}`}>{v.severity}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400 max-w-xs truncate">{v.evidence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Coverage tab */}
            {activeTab === "coverage" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(report.coverage ?? []).map((c, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
                    c.hasIssues ? "border-red-200 bg-red-50/50 dark:border-red-500/20 dark:bg-red-500/5"
                    : c.tested ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/5"
                    : "border-gray-200 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800/30"
                  }`}>
                    {c.hasIssues ? <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      : c.tested ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      : <div className="w-4 h-4 border-2 border-gray-300 dark:border-zinc-600 rounded-full shrink-0" />}
                    <span className="font-mono text-xs text-gray-700 dark:text-zinc-300 truncate">{c.route}</span>
                    {c.hasIssues && <span className="ml-auto text-xs text-red-600 dark:text-red-400 shrink-0">Issues</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Performance tab */}
            {activeTab === "performance" && (
              !report.performance ? (
                <div className="py-10 text-center text-gray-400 dark:text-zinc-500">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>Performance test was not run. Enable it in the options and re-scan.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800">
                        {["Route", "Avg", "P95", "Req/s", "Success", "Status"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                      {report.performance.routes.map((r, i) => (
                        <tr key={i} className="bg-white dark:bg-zinc-900">
                          <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-zinc-400">{r.route}</td>
                          <td className="px-4 py-3 text-xs">{r.avgLatency}ms</td>
                          <td className="px-4 py-3 text-xs">{r.p95Latency}ms</td>
                          <td className="px-4 py-3 text-xs">{r.requestsPerSecond}</td>
                          <td className="px-4 py-3 text-xs">{r.successRate}%</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${
                              r.status === "pass" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                                : r.status === "failing" ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                                : "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20"
                            }`}>{r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ── History ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wide mb-3">
          History
          {runs.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded-full">{runs.length} run{runs.length !== 1 ? "s" : ""}</span>
          )}
        </h2>

        <div className="space-y-2">
          {runs.length === 0 && !runsLoading && (
            <div className="text-center py-12 text-gray-400 dark:text-zinc-500">
              <Swords className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No scans yet. Configure a target above and click &quot;Run Attack&quot;.</p>
            </div>
          )}

          {runs.map((run) => (
            <div
              key={run.id}
              onClick={() => run.status === "completed" && loadReport(run.id)}
              className={`p-4 rounded-xl border transition-all ${
                run.status === "completed" ? "cursor-pointer hover:border-gray-300 dark:hover:border-zinc-700" : ""
              } border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {run.status === "running" ? <Loader2 className="w-5 h-5 text-yellow-500 animate-spin shrink-0" />
                    : run.status === "completed" ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    : run.status === "stopped" ? <Square className="w-5 h-5 text-zinc-400 shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {run.baseUrl}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      {new Date(Number(run.createdAt)).toLocaleString()}
                      {run.routesFound ? ` · ${run.routesFound} routes` : ""}
                      {run.summary ? ` · ${run.summary.slice(0, 80)}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {run.status === "completed" && run.overallScore !== null && (
                    <span className={`text-lg font-bold ${scoreColor(run.overallScore)}`}>{run.overallScore}/100</span>
                  )}
                  {run.status === "completed" && run.riskLevel && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${RISK_BADGE[(run.riskLevel ?? "").toLowerCase()] ?? RISK_BADGE.low}`}>
                      {run.riskLevel}
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-medium rounded-md border ${
                    run.status === "running" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20"
                      : run.status === "completed" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                      : run.status === "stopped" ? "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                  }`}>{run.status}</span>
                </div>
              </div>

              {run.status === "completed" && (run.criticalCount ?? 0) + (run.highCount ?? 0) > 0 && (
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-400 pl-8">
                  {(run.criticalCount ?? 0) > 0 && <span className="text-red-600 dark:text-red-400 font-medium">{run.criticalCount} critical</span>}
                  {(run.highCount ?? 0) > 0 && <span className="text-orange-600 dark:text-orange-400 font-medium">{run.highCount} high</span>}
                  {(run.mediumCount ?? 0) > 0 && <span className="text-yellow-600 dark:text-yellow-400">{run.mediumCount} medium</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
