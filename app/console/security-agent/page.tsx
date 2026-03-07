"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert, Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Loader2, ExternalLink, ChevronDown, ChevronUp, Info,
} from "lucide-react";

const DEPLOY_STATUS_BADGE: Record<string, string> = {
  live: "bg-green-500",
  deploying: "bg-yellow-500 animate-pulse",
  failed: "bg-red-500",
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-300 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  high: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30",
  low: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  info: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-600",
};

interface Deployment {
  sandboxId: string;
  repoName: string;
  repoUrl: string;
  status: string;
  publicUrl: string;
}

interface AgentRun {
  id: string;
  sandbox_id: string;
  status: string;
  created_at: number;
  finished_at: number | null;
  total_routes: number | null;
  overall_score: number | null;
  critical_count: number | null;
  high_count: number | null;
  medium_count: number | null;
  low_count: number | null;
  summary: string | null;
}

interface Finding {
  route: string;
  checkType: string;
  result: string;
  severity: string;
  details: string;
  payload: string | null;
}

interface CoverageEntry {
  route: string;
  tested: boolean;
  hasIssues: boolean;
}

interface AiAnalysis {
  summary: string;
  riskLevel: string;
  criticalFindings: string[];
  recommendations: string[];
  attackReplay?: string[];
}

interface Report {
  run: {
    id: string;
    sandboxId: string;
    status: string;
    createdAt: number;
    finishedAt: number | null;
    totalRoutes: number | null;
    overallScore: number | null;
    criticalCount: number | null;
    highCount: number | null;
    mediumCount: number | null;
    lowCount: number | null;
    summary: string | null;
  };
  aiAnalysis: AiAnalysis | null;
  findings: Finding[];
  coverageMap: CoverageEntry[];
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-gray-400 dark:text-zinc-500";
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 50) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function riskBadge(level: string): string {
  switch (level.toLowerCase()) {
    case "critical": return "bg-red-100 text-red-800 border-red-300 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30";
    case "high": return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30";
    case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30";
    case "low": return "bg-green-100 text-green-800 border-green-300 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30";
    default: return "bg-gray-100 text-gray-600 border-gray-300 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-600";
  }
}

export default function Page() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedSandbox, setSelectedSandbox] = useState("");
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    findings: true,
    coverage: false,
    ai: true,
  });

  const selectedDeployment = deployments.find((d) => d.sandboxId === selectedSandbox);

  const toggle = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  /* ---- data fetching ---- */
  useEffect(() => {
    fetch("/api/deploy")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const all = (d.deployments ?? []).filter((dep: Deployment) => dep.status !== "failed");
          setDeployments(all);
          if (all.length > 0) setSelectedSandbox((prev) => prev || all[0].sandboxId);
        }
      })
      .catch(() => null);
  }, []);

  const fetchRuns = useCallback(async () => {
    if (!selectedSandbox) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/security-agent/run?sandboxId=${encodeURIComponent(selectedSandbox)}`);
      const data = await res.json();
      if (data.ok) setRuns(data.runs ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedSandbox]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on sandbox change
    setRuns([]);
    setReport(null);
    setSelectedRun(null);
    fetchRuns();
  }, [fetchRuns]);

  const fetchReport = async (runId: string) => {
    setSelectedRun(runId);
    setReportLoading(true);
    try {
      const res = await fetch(`/api/security-agent/report?runId=${encodeURIComponent(runId)}`);
      const data = await res.json();
      if (data.ok) setReport(data);
      else setReport(null);
    } catch { setReport(null); }
    setReportLoading(false);
  };

  const handleRun = async () => {
    if (!selectedSandbox) { setDeployError("Select a deployment first."); return; }
    if (selectedDeployment?.status !== "live") { setDeployError("Deployment must be live to run agent."); return; }
    setDeployError(null);
    setRunning(true);
    try {
      const res = await fetch("/api/security-agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId: selectedSandbox }),
      });
      const data = await res.json();
      if (data.ok) {
        setTimeout(fetchRuns, 1000);
        setTimeout(fetchRuns, 5000);
        setTimeout(fetchRuns, 15000);
        setTimeout(fetchRuns, 30000);
      } else {
        setDeployError(data.error ?? "Failed to start agent");
      }
    } catch { setDeployError("Network error."); }
    setRunning(false);
  };

  // Auto-refresh while any run is still running
  useEffect(() => {
    if (runs.some((r) => r.status === "running")) {
      const interval = setInterval(fetchRuns, 8000);
      return () => clearInterval(interval);
    }
  }, [runs, fetchRuns]);

  /* ---- derived data ---- */
  const failFindings = report?.findings.filter((f) => f.result === "fail") ?? [];
  const passFindings = report?.findings.filter((f) => f.result === "pass") ?? [];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6" /> Security Agent
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Autonomous AI-assisted security testing — route discovery, vulnerability scanning, and analysis
        </p>
      </div>

      {/* Deployment selector */}
      <div className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          Select Deployment
        </label>
        {deployments.length === 0 ? (
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            No deployments found. Deploy a project first from the{" "}
<Link href="/console/deployments" className="underline">Deployments</Link> page.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedSandbox}
                onChange={(e) => setSelectedSandbox(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
              >
                {deployments.map((d) => (
                  <option key={d.sandboxId} value={d.sandboxId}>
                    [{d.status.toUpperCase()}] {d.repoName} — {d.sandboxId.slice(0, 12)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleRun}
                disabled={running}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-colors disabled:opacity-60"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {running ? "Starting…" : "Run Agent"}
              </button>
              <button
                onClick={fetchRuns}
                disabled={loading}
                title="Refresh runs"
                className="flex items-center justify-center w-9 h-9 text-gray-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            {selectedDeployment && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${DEPLOY_STATUS_BADGE[selectedDeployment.status] ?? "bg-gray-400"}`} />
                  <span className="font-medium text-gray-700 dark:text-zinc-300">{selectedDeployment.status}</span>
                </span>
                <span className="text-gray-400">·</span>
                <a
                  href={selectedDeployment.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-mono truncate max-w-xs"
                >
                  {selectedDeployment.publicUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                <span className="text-gray-400">·</span>
                <a
                  href={selectedDeployment.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-gray-500 dark:text-zinc-400 hover:underline"
                >
                  {selectedDeployment.repoName} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
            {deployError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{deployError}</p>
            )}
          </>
        )}
      </div>

      {/* Runs list */}
      <div className="space-y-3 mb-8">
        {runs.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400 dark:text-zinc-500">
            <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No security agent runs yet. Select a deployment and click &quot;Run Agent&quot;.</p>
          </div>
        )}
        {runs.map((run) => {
          const isSelected = selectedRun === run.id;
          const isDone = run.status === "completed";
          const isFailed = run.status === "failed";
          return (
            <div
              key={run.id}
              onClick={() => isDone && fetchReport(run.id)}
              className={`p-4 rounded-xl border transition-all ${
                isSelected
                  ? "border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/5"
                  : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700"
              } ${isDone ? "cursor-pointer" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {run.status === "running" ? (
                    <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                  ) : isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      Security Agent — {new Date(Number(run.created_at)).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      {run.summary ?? (run.status === "running" ? "Scanning… this may take a few minutes" : isFailed ? "Scan failed" : "No summary")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isDone && run.overall_score !== null && (
                    <span className={`text-lg font-bold ${scoreColor(run.overall_score)}`}>
                      {run.overall_score}/100
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-medium rounded-md border ${
                    run.status === "running"
                      ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20"
                      : isDone
                        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                  }`}>
                    {run.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading report */}
      {reportLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="ml-2 text-sm text-gray-500 dark:text-zinc-400">Loading report…</span>
        </div>
      )}

      {/* Report view */}
      {report && !reportLoading && (
        <div className="space-y-6">
          {/* Score & severity summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl border bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 col-span-2 sm:col-span-1 flex flex-col items-center justify-center">
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">Score</p>
              <p className={`text-3xl font-bold mt-1 ${scoreColor(report.run.overallScore)}`}>
                {report.run.overallScore ?? "—"}
              </p>
            </div>
            {([
              { label: "Critical", count: report.run.criticalCount, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
              { label: "High", count: report.run.highCount, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20" },
              { label: "Medium", count: report.run.mediumCount, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20" },
              { label: "Low", count: report.run.lowCount, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" },
            ] as const).map(({ label, count, color, bg }) => (
              <div key={label} className={`p-4 rounded-xl border ${bg}`}>
                <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>{count ?? 0}</p>
              </div>
            ))}
          </div>

          {/* AI Analysis */}
          {report.aiAnalysis && (
            <div className="rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-500/5 overflow-hidden">
              <button
                onClick={() => toggle("ai")}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <h3 className="font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2">
                  <Info className="w-4 h-4" /> AI Analysis — Risk: {" "}
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${riskBadge(report.aiAnalysis.riskLevel)}`}>
                    {report.aiAnalysis.riskLevel}
                  </span>
                </h3>
                {expandedSections.ai ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
              </button>
              {expandedSections.ai && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm text-gray-700 dark:text-zinc-300">{report.aiAnalysis.summary}</p>

                  {report.aiAnalysis.criticalFindings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-1">Critical Findings</p>
                      <ul className="list-disc list-inside text-sm text-gray-700 dark:text-zinc-300 space-y-0.5">
                        {report.aiAnalysis.criticalFindings.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  )}

                  {report.aiAnalysis.recommendations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase mb-1">Recommendations</p>
                      <ul className="list-disc list-inside text-sm text-gray-700 dark:text-zinc-300 space-y-0.5">
                        {report.aiAnalysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Findings table */}
          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
            <button
              onClick={() => toggle("findings")}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/60"
            >
              <h3 className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Findings ({failFindings.length} issues, {passFindings.length} passed)
              </h3>
              {expandedSections.findings ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {expandedSections.findings && failFindings.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/60">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Route</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Check</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Severity</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {failFindings.map((f, i) => (
                    <tr key={i} className="bg-white dark:bg-zinc-900">
                      <td className="px-4 py-3 font-mono text-xs">{f.route}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400">{f.checkType}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${SEVERITY_BADGE[f.severity] ?? SEVERITY_BADGE.info}`}>
                          {f.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400 max-w-sm truncate" title={f.details}>{f.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {expandedSections.findings && failFindings.length === 0 && (
              <div className="p-6 text-center text-gray-400 dark:text-zinc-500 text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                No vulnerabilities found — all checks passed.
              </div>
            )}
          </div>

          {/* Coverage map */}
          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
            <button
              onClick={() => toggle("coverage")}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/60"
            >
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                Route Coverage ({report.coverageMap.length} routes)
              </h3>
              {expandedSections.coverage ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {expandedSections.coverage && (
              <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                {report.coverageMap.map((c) => (
                  <div key={c.route} className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-zinc-900">
                    {c.hasIssues ? (
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    )}
                    <span className="font-mono text-xs text-gray-800 dark:text-zinc-200">{c.route}</span>
                    {c.hasIssues && (
                      <span className="text-xs text-red-500 dark:text-red-400 ml-auto">issues found</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {report.run.summary && (
            <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">Summary</p>
              <p className="text-sm text-gray-700 dark:text-zinc-300">{report.run.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
