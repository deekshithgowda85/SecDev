"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Shield, ShieldAlert, Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Sparkles, Loader2, ExternalLink, Download, Square, ChevronDown, ChevronUp, Info,
} from "lucide-react";

const DEPLOY_STATUS_BADGE: Record<string, string> = {
  live: "bg-green-500",
  deploying: "bg-yellow-500 animate-pulse",
  failed: "bg-red-500",
};

interface Deployment {
  sandboxId: string;
  repoName: string;
  repoUrl: string;
  status: string;
  publicUrl: string;
}

interface TestRun {
  id: string;
  sandboxId: string;
  type: string;
  status: string;
  createdAt: number;
  finishedAt: number | null;
  summary: string | null;
}

interface SecurityResult {
  route: string;
  check_type: string;
  result: string;
  details: string;
  severity: string;
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-300 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  high: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30",
  low: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  info: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-600",
};

// â”€â”€ Agent-specific types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
interface CoverageEntry { route: string; tested: boolean; hasIssues: boolean; }
interface AiAnalysis {
  summary: string;
  riskLevel: string;
  criticalFindings: string[];
  recommendations: string[];
}
interface Report {
  run: {
    id: string; sandboxId: string; status: string; createdAt: number;
    finishedAt: number | null; totalRoutes: number | null; overallScore: number | null;
    criticalCount: number | null; highCount: number | null; mediumCount: number | null;
    lowCount: number | null; summary: string | null;
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

// â”€â”€ Combined Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Page() {
  const [tab, setTab] = useState<"scans" | "agent">("scans");

  // â”€â”€ Shared â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedSandbox, setSelectedSandbox] = useState<string>("");
  const [deployError, setDeployError] = useState<string | null>(null);

  const selectedDeployment = deployments.find((d) => d.sandboxId === selectedSandbox);

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

  // â”€â”€ Scans tab state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [scanRuns, setScanRuns] = useState<TestRun[]>([]);
  const [results, setResults] = useState<SecurityResult[]>([]);
  const [selectedScanRun, setSelectedScanRun] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchScanRuns = useCallback(async () => {
    if (!selectedSandbox) return;
    setScanLoading(true);
    try {
      const res = await fetch(`/api/tests/run?sandboxId=${selectedSandbox}&type=security`);
      const data = await res.json();
      if (data.ok) setScanRuns(data.runs ?? []);
    } catch { /* ignore */ }
    setScanLoading(false);
  }, [selectedSandbox]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on sandbox change
    setScanRuns([]);
    setResults([]);
    setSelectedScanRun(null);
    setAnalysis(null);
    fetchScanRuns();
  }, [fetchScanRuns]);

  useEffect(() => {
    if (scanRuns.some((r) => r.status === "running")) {
      const interval = setInterval(fetchScanRuns, 5000);
      return () => clearInterval(interval);
    }
  }, [scanRuns, fetchScanRuns]);

  const fetchScanResults = async (runId: string) => {
    setSelectedScanRun(runId);
    setAnalysis(null);
    try {
      const res = await fetch(`/api/tests/results?runId=${runId}`);
      const data = await res.json();
      if (data.ok) setResults(data.results ?? []);
    } catch { /* ignore */ }
  };

  const handleRunScan = async () => {
    if (!selectedSandbox) { setDeployError("Select a deployment first."); return; }
    if (selectedDeployment?.status !== "live") { setDeployError("Deployment must be live to run a scan."); return; }
    setDeployError(null);
    setScanning(true);
    try {
      const res = await fetch("/api/tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId: selectedSandbox, type: "security" }),
      });
      const data = await res.json();
      if (data.ok) { setTimeout(fetchScanRuns, 1000); setTimeout(fetchScanRuns, 5000); }
      else setDeployError(data.error ?? "Failed to start scan");
    } catch { setDeployError("Network error."); }
    setScanning(false);
  };

  const handleStopScan = async (runId: string) => {
    try {
      await fetch("/api/tests/stop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId }) });
      await fetchScanRuns();
    } catch { /* ignore */ }
  };

  const handleAnalyze = async (runId: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/tests/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId }) });
      const data = await res.json();
      if (data.ok) setAnalysis(data.analysis);
    } catch { /* ignore */ }
    setAnalyzing(false);
  };

  const handleDownloadScan = async (runId: string) => {
    try {
      const res = await fetch(`/api/tests/results?runId=${runId}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `security-results-${runId}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const critCount = results.filter((r) => r.severity === "critical" && r.result === "fail").length;
  const highCount = results.filter((r) => r.severity === "high" && r.result === "fail").length;
  const passCount = results.filter((r) => r.result === "pass").length;

  // â”€â”€ Agent tab state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [selectedAgentRun, setSelectedAgentRun] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [expanded, setExpanded] = useState({ findings: true, coverage: false, ai: true });
  const toggle = (k: keyof typeof expanded) => setExpanded((p) => ({ ...p, [k]: !p[k] }));

  const fetchAgentRuns = useCallback(async () => {
    if (!selectedSandbox) return;
    setAgentLoading(true);
    try {
      const res = await fetch(`/api/security-agent/run?sandboxId=${encodeURIComponent(selectedSandbox)}`);
      const data = await res.json();
      if (data.ok) setAgentRuns(data.runs ?? []);
    } catch { /* ignore */ }
    setAgentLoading(false);
  }, [selectedSandbox]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on sandbox change
    setAgentRuns([]);
    setReport(null);
    setSelectedAgentRun(null);
    fetchAgentRuns();
  }, [fetchAgentRuns]);

  useEffect(() => {
    if (agentRuns.some((r) => r.status === "running")) {
      const interval = setInterval(fetchAgentRuns, 8000);
      return () => clearInterval(interval);
    }
  }, [agentRuns, fetchAgentRuns]);

  const fetchReport = async (runId: string) => {
    setSelectedAgentRun(runId);
    setReportLoading(true);
    try {
      const res = await fetch(`/api/security-agent/report?runId=${encodeURIComponent(runId)}`);
      const data = await res.json();
      if (data.ok) setReport(data);
      else setReport(null);
    } catch { setReport(null); }
    setReportLoading(false);
  };

  const handleRunAgent = async () => {
    if (!selectedSandbox) { setDeployError("Select a deployment first."); return; }
    if (selectedDeployment?.status !== "live") { setDeployError("Deployment must be live to run agent."); return; }
    setDeployError(null);
    setAgentRunning(true);
    try {
      const res = await fetch("/api/security-agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId: selectedSandbox }),
      });
      const data = await res.json();
      if (data.ok) { setTimeout(fetchAgentRuns, 1000); setTimeout(fetchAgentRuns, 5000); setTimeout(fetchAgentRuns, 15000); }
      else setDeployError(data.error ?? "Failed to start agent");
    } catch { setDeployError("Network error."); }
    setAgentRunning(false);
  };

  const failFindings = report?.findings.filter((f) => f.result === "fail") ?? [];
  const passFindings = report?.findings.filter((f) => f.result === "pass") ?? [];

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6" /> Security
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            OWASP vulnerability scans and autonomous AI security agent
          </p>
        </div>
        {/* Tab switcher */}
        <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setTab("scans")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "scans"
                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4" /> Scans
          </button>
          <button
            onClick={() => setTab("agent")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "agent"
                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> Agent
          </button>
        </div>
      </div>

      {/* Deployment selector â€” shared */}
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
                onChange={(e) => { setSelectedSandbox(e.target.value); setDeployError(null); }}
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
              >
                {deployments.map((d) => (
                  <option key={d.sandboxId} value={d.sandboxId}>
                    [{d.status.toUpperCase()}] {d.repoName} â€” {d.sandboxId.slice(0, 12)}
                  </option>
                ))}
              </select>

              {tab === "scans" ? (
                <button
                  onClick={handleRunScan}
                  disabled={scanning}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
                >
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {scanning ? "Startingâ€¦" : "Run Scan"}
                </button>
              ) : (
                <button
                  onClick={handleRunAgent}
                  disabled={agentRunning}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60"
                >
                  {agentRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {agentRunning ? "Startingâ€¦" : "Run Agent"}
                </button>
              )}

              <button
                onClick={tab === "scans" ? fetchScanRuns : fetchAgentRuns}
                disabled={tab === "scans" ? scanLoading : agentLoading}
                title="Refresh"
                className="flex items-center justify-center w-9 h-9 text-gray-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${(tab === "scans" ? scanLoading : agentLoading) ? "animate-spin" : ""}`} />
              </button>
            </div>

            {selectedDeployment && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${DEPLOY_STATUS_BADGE[selectedDeployment.status] ?? "bg-gray-400"}`} />
                  <span className="font-medium text-gray-700 dark:text-zinc-300">{selectedDeployment.status}</span>
                </span>
                <span className="text-gray-400">Â·</span>
                <a href={selectedDeployment.publicUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-mono truncate max-w-xs">
                  {selectedDeployment.publicUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                <span className="text-gray-400">Â·</span>
                <a href={selectedDeployment.repoUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-gray-500 dark:text-zinc-400 hover:underline">
                  {selectedDeployment.repoName} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
            {deployError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{deployError}</p>}
          </>
        )}
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â• SCANS TAB â•â•â•â•â•â•â•â•â•â•â• */}
      {tab === "scans" && (
        <>
          {/* Severity stats */}
          {selectedScanRun && results.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: "Critical", count: critCount, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
                { label: "High", count: highCount, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20" },
                { label: "Passed", count: passCount, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20" },
                { label: "Total", count: results.length, color: "text-gray-600 dark:text-zinc-400", bg: "bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700" },
              ].map(({ label, count, color, bg }) => (
                <div key={label} className={`p-4 rounded-xl border ${bg}`}>
                  <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${color}`}>{count}</p>
                </div>
              ))}
            </div>
          )}

          {/* History header */}
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wide">
              History
              {scanRuns.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded-full">{scanRuns.length} run{scanRuns.length !== 1 ? "s" : ""}</span>
              )}
            </h2>
          </div>

          {/* Scan runs list */}
          <div className="space-y-3 mb-8">
            {scanRuns.length === 0 && !scanLoading && (
              <div className="text-center py-12 text-gray-400 dark:text-zinc-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No security scans yet. Select a deployment and click &quot;Run Scan&quot;.</p>
              </div>
            )}
            {scanRuns.map((run) => (
              <div key={run.id} onClick={() => run.status === "completed" && fetchScanResults(run.id)}
                className={`p-4 rounded-xl border transition-all ${
                  selectedScanRun === run.id
                    ? "border-red-300 dark:border-red-500/50 bg-red-50/50 dark:bg-red-500/5"
                    : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700"
                } ${run.status === "completed" ? "cursor-pointer" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {run.status === "running" ? <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                      : run.status === "completed" ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                      : <XCircle className="w-5 h-5 text-red-500" />}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        Security Scan â€” {new Date(run.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        {run.summary ?? (run.status === "running" ? "Scanningâ€¦" : "No summary")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {run.status === "running" && (
                      <button onClick={(e) => { e.stopPropagation(); handleStopScan(run.id); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-100 transition-colors">
                        <Square className="w-3 h-3 fill-current" /> Stop
                      </button>
                    )}
                    {run.status === "completed" && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); handleDownloadScan(run.id); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                          <Download className="w-3 h-3" /> Download
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleAnalyze(run.id); }} disabled={analyzing}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50">
                          <Sparkles className="w-3 h-3" /> AI Analyze
                        </button>
                      </>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded-md border ${
                      run.status === "running" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20"
                        : run.status === "completed" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                    }`}>{run.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* AI Analysis */}
          {analysis && (
            <div className="mb-8 p-4 rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-500/5">
              <h3 className="font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" /> AI Security Analysis
              </h3>
              <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">{analysis}</p>
            </div>
          )}

          {/* Results table */}
          {selectedScanRun && results.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Route</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Check</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Result</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Severity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {results.map((r, i) => (
                    <tr key={i} className="bg-white dark:bg-zinc-900">
                      <td className="px-4 py-3 font-mono text-xs">{r.route}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400">{r.check_type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${r.result === "pass" ? "text-green-600 dark:text-green-400" : r.result === "fail" ? "text-red-600 dark:text-red-400" : "text-gray-500"}`}>
                          {r.result === "pass" ? <CheckCircle2 className="w-3.5 h-3.5" /> : r.result === "fail" ? <XCircle className="w-3.5 h-3.5" /> : null}
                          {r.result}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${SEVERITY_BADGE[r.severity] ?? SEVERITY_BADGE.info}`}>{r.severity}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400 max-w-sm truncate">{r.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â• AGENT TAB â•â•â•â•â•â•â•â•â•â•â• */}
      {tab === "agent" && (
        <>
          {/* History header */}
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wide">
              History
              {agentRuns.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded-full">{agentRuns.length} run{agentRuns.length !== 1 ? "s" : ""}</span>
              )}
            </h2>
          </div>

          {/* Agent runs list */}
          <div className="space-y-3 mb-8">
            {agentRuns.length === 0 && !agentLoading && (
              <div className="text-center py-12 text-gray-400 dark:text-zinc-500">
                <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No security agent runs yet. Select a deployment and click &quot;Run Agent&quot;.</p>
              </div>
            )}
            {agentRuns.map((run) => {
              const isDone = run.status === "completed";
              return (
                <div key={run.id} onClick={() => isDone && fetchReport(run.id)}
                  className={`p-4 rounded-xl border transition-all ${
                    selectedAgentRun === run.id
                      ? "border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/5"
                      : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700"
                  } ${isDone ? "cursor-pointer" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {run.status === "running" ? <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                        : isDone ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                        : <XCircle className="w-5 h-5 text-red-500" />}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          Security Agent â€” {new Date(Number(run.created_at)).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          {run.summary ?? (run.status === "running" ? "Scanningâ€¦ this may take a few minutes" : run.status === "failed" ? "Scan failed" : "No summary")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isDone && run.overall_score !== null && (
                        <span className={`text-lg font-bold ${scoreColor(run.overall_score)}`}>{run.overall_score}/100</span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-md border ${
                        run.status === "running" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20"
                          : isDone ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                          : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                      }`}>{run.status}</span>
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
              <span className="ml-2 text-sm text-gray-500 dark:text-zinc-400">Loading reportâ€¦</span>
            </div>
          )}

          {/* Agent report */}
          {report && !reportLoading && (
            <div className="space-y-6">
              {/* Score + severity summary */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl border bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 col-span-2 sm:col-span-1 flex flex-col items-center justify-center">
                  <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">Score</p>
                  <p className={`text-3xl font-bold mt-1 ${scoreColor(report.run.overallScore)}`}>{report.run.overallScore ?? "â€”"}</p>
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
                  <button onClick={() => toggle("ai")} className="w-full flex items-center justify-between p-4 text-left">
                    <h3 className="font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2">
                      <Info className="w-4 h-4" /> AI Analysis â€” Risk:{" "}
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${riskBadge(report.aiAnalysis.riskLevel)}`}>{report.aiAnalysis.riskLevel}</span>
                    </h3>
                    {expanded.ai ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
                  </button>
                  {expanded.ai && (
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
                <button onClick={() => toggle("findings")} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/60">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Findings ({failFindings.length} issues, {passFindings.length} passed)
                  </h3>
                  {expanded.findings ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {expanded.findings && failFindings.length > 0 && (
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
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${SEVERITY_BADGE[f.severity] ?? SEVERITY_BADGE.info}`}>{f.severity}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400 max-w-sm truncate" title={f.details}>{f.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {expanded.findings && failFindings.length === 0 && (
                  <div className="p-6 text-center text-gray-400 dark:text-zinc-500 text-sm">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    No vulnerabilities found â€” all checks passed.
                  </div>
                )}
              </div>

              {/* Coverage map */}
              <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                <button onClick={() => toggle("coverage")} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/60">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                    Route Coverage ({report.coverageMap.length} routes)
                  </h3>
                  {expanded.coverage ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {expanded.coverage && (
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {report.coverageMap.map((c, i) => (
                      <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono border ${
                        !c.tested ? "bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-400"
                          : c.hasIssues ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"
                          : "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400"
                      }`}>
                        {c.tested ? (c.hasIssues ? <XCircle className="w-3 h-3 shrink-0" /> : <CheckCircle2 className="w-3 h-3 shrink-0" />) : <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-zinc-600 shrink-0" />}
                        <span className="truncate">{c.route}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
