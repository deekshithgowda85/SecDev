"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Zap, Play, RefreshCw, CheckCircle2, XCircle,
  Sparkles, Loader2, ExternalLink, Download,
  Square, Terminal, ChevronDown, ChevronUp, BotMessageSquare,
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

interface ApiResult {
  endpoint: string;
  method: string;
  status: string;
  status_code: number;
  latency: number;
  response_body: string | null;
}

interface LogLine {
  id: number;
  level: string;
  message: string;
  created_at: number;
}

const METHOD_BADGE: Record<string, string> = {
  GET: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  PUT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  PATCH: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

const LOG_COLOR: Record<string, string> = {
  success: "text-green-400",
  error:   "text-red-400",
  warn:    "text-yellow-400",
  info:    "text-zinc-300",
};

const STATUS_BADGE: Record<string, string> = {
  pass: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
  fail: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  skip: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-600",
  error: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20",
};

export default function Page() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedSandbox, setSelectedSandbox] = useState<string>("");
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [results, setResults] = useState<ApiResult[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Live logs
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [liveRunId, setLiveRunId] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [lastLogId, setLastLogId] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // AI Plan
  const [planLoading, setPlanLoading] = useState(false);
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

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

  const fetchRuns = useCallback(async () => {
    if (!selectedSandbox) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/run?sandboxId=${selectedSandbox}&type=api`);
      const data = await res.json();
      if (data.ok) setRuns(data.runs ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedSandbox]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on sandbox change
    setRuns([]);
    setResults([]);
    setSelectedRun(null);
    setAnalysis(null);
    setExpandedRow(null);
    setLogs([]);
    setLiveRunId(null);
    setPlan(null);
    fetchRuns();
  }, [fetchRuns]);

  const fetchLogs = useCallback(async (runId: string, after: number) => {
    try {
      const res = await fetch(`/api/tests/logs?runId=${runId}&after=${after}`);
      const data = await res.json();
      if (data.ok && data.logs?.length > 0) {
        setLogs((prev) => [...prev, ...data.logs]);
        setLastLogId(data.logs[data.logs.length - 1].id);
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (logsOpen) logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, logsOpen]);

  // Detect newly running run and start streaming
  useEffect(() => {
    const runningRun = runs.find((r) => r.status === "running");
    if (runningRun && liveRunId !== runningRun.id) {
      setLiveRunId(runningRun.id);
      setLogs([]);
      setLastLogId(0);
      setLogsOpen(true);
    }
  }, [runs, liveRunId]);

  // Poll logs + runs while live
  useEffect(() => {
    if (!liveRunId) return;
    const run = runs.find((r) => r.id === liveRunId);
    if (!run || run.status !== "running") return;
    const interval = setInterval(async () => {
      await Promise.all([fetchLogs(liveRunId, lastLogId), fetchRuns()]);
    }, 2000);
    return () => clearInterval(interval);
  }, [liveRunId, lastLogId, runs, fetchLogs, fetchRuns]);

  const fetchResults = async (runId: string) => {
    setSelectedRun(runId);
    setAnalysis(null);
    setExpandedRow(null);
    try {
      const res = await fetch(`/api/tests/results?runId=${runId}`);
      const data = await res.json();
      if (data.ok) setResults(data.results ?? []);
    } catch { /* ignore */ }
    // Load historical logs for completed run
    setLogs([]);
    setLastLogId(0);
    setLiveRunId(runId);
    await fetchLogs(runId, 0);
  };

  const handleRun = async () => {
    if (!selectedSandbox) { setDeployError("Select a deployment first."); return; }
    if (selectedDeployment?.status !== "live") { setDeployError("Deployment must be live to run API tests."); return; }
    setDeployError(null);
    setRunning(true);
    try {
      const res = await fetch("/api/tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId: selectedSandbox, type: "api" }),
      });
      const data = await res.json();
      if (data.ok) {
        setLiveRunId(data.runId);
        setLogs([]);
        setLastLogId(0);
        setLogsOpen(true);
        setTimeout(fetchRuns, 1000);
      } else {
        setDeployError(data.error ?? "Failed to start API tests");
      }
    } catch { setDeployError("Network error."); }
    setRunning(false);
  };

  const handleStop = async (runId: string) => {
    try {
      await fetch("/api/tests/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      await fetchRuns();
    } catch { /* ignore */ }
  };

  const handleAiPlan = async () => {
    if (!selectedSandbox) { setDeployError("Select a deployment first."); return; }
    setDeployError(null);
    setPlanLoading(true);
    setPlan(null);
    try {
      const res = await fetch("/api/tests/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId: selectedSandbox }),
      });
      const data = await res.json();
      if (data.ok) { setPlan(data.plan); setPlanOpen(true); }
      else setDeployError(data.error ?? "AI plan failed");
    } catch { setDeployError("Network error."); }
    setPlanLoading(false);
  };

  const handleAnalyze = async (runId: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/tests/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      const data = await res.json();
      if (data.ok) setAnalysis(data.analysis);
    } catch { /* ignore */ }
    setAnalyzing(false);
  };

  const handleDownload = async (runId: string) => {
    try {
      const res = await fetch(`/api/tests/results?runId=${runId}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `api-results-${runId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-6 h-6" /> API Testing
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Discover and validate API endpoints with live logs &amp; AI security planning
          </p>
        </div>
        <button
          onClick={handleAiPlan}
          disabled={planLoading || !selectedSandbox}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-60"
        >
          {planLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BotMessageSquare className="w-4 h-4" />}
          AI Security Plan
        </button>
      </div>

      {/* Deployment selector card */}
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
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors disabled:opacity-60"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {running ? "Starting…" : "Run API Tests"}
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

      {/* Live Log Terminal */}
      {liveRunId && (
        <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-950 overflow-hidden">
          <button
            onClick={() => setLogsOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-mono text-zinc-300 bg-zinc-900 hover:bg-zinc-800 transition-colors border-b border-zinc-700"
          >
            <Terminal className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-400 font-semibold">LIVE LOGS</span>
            <span className="text-zinc-500 ml-1 font-mono truncate max-w-xs">{liveRunId}</span>
            <span className="ml-auto text-zinc-500">{logs.length} lines</span>
            {logsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {logsOpen && (
            <div className="p-4 max-h-72 overflow-y-auto font-mono text-xs leading-5 space-y-0.5">
              {logs.length === 0 && (
                <p className="text-zinc-500 animate-pulse">Waiting for logs…</p>
              )}
              {logs.map((l) => (
                <p key={l.id} className={LOG_COLOR[l.level] ?? "text-zinc-300"}>
                  <span className="text-zinc-600 select-none">[{new Date(l.created_at).toLocaleTimeString()}] </span>
                  <span className="text-zinc-500 uppercase text-[10px] mr-1">{l.level.slice(0, 4)}</span>
                  {l.message}
                </p>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}

      {/* AI Security Plan Panel */}
      {plan && planOpen && (
        <div className="mb-6 rounded-xl border border-purple-300 dark:border-purple-500/40 bg-purple-50 dark:bg-purple-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-purple-200 dark:border-purple-500/30">
            <BotMessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-400">AI Security Test Plan</h3>
            <button onClick={() => setPlanOpen(false)} className="ml-auto text-xs text-purple-500 hover:text-purple-700">Dismiss</button>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-gray-700 dark:text-zinc-300 whitespace-pre-wrap font-mono leading-5">
              {JSON.stringify(plan, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* History header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wide">
          History
          {runs.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded-full">
              {runs.length} run{runs.length !== 1 ? "s" : ""}
            </span>
          )}
        </h2>
      </div>

      {/* Runs list */}
      <div className="space-y-3 mb-8">
        {runs.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400 dark:text-zinc-500">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No API test runs yet. Select a deployment and click &quot;Run API Tests&quot;.</p>
          </div>
        )}
        {runs.map((run) => (
          <div
            key={run.id}
            onClick={() => run.status === "completed" && fetchResults(run.id)}
            className={`p-4 rounded-xl border transition-all ${
              selectedRun === run.id
                ? "border-blue-300 dark:border-blue-500/50 bg-blue-50/50 dark:bg-blue-500/5"
                : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700"
            } ${run.status === "completed" ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {run.status === "running" ? (
                  <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                ) : run.status === "completed" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    API Test — {new Date(run.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    {run.summary ?? (run.status === "running" ? "Testing… (check live logs above)" : "No summary")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {run.status === "running" && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setLiveRunId(run.id); setLogsOpen(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                    >
                      <Terminal className="w-3 h-3" /> Logs
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStop(run.id); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    >
                      <Square className="w-3 h-3 fill-current" /> Stop
                    </button>
                  </>
                )}
                {run.status === "completed" && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(run.id); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAnalyze(run.id); }}
                      disabled={analyzing}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" /> AI Analyze
                    </button>
                  </>
                )}
                <span className={`px-2 py-1 text-xs font-medium rounded-md border ${
                  run.status === "running" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20" :
                  run.status === "completed" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" :
                  "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                }`}>
                  {run.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Analysis */}
      {analysis && (
        <div className="mb-8 p-4 rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-500/5">
          <h3 className="font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4" /> AI API Analysis
          </h3>
          <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">{analysis}</p>
        </div>
      )}

      {/* Results table */}
      {selectedRun && results.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/60 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Test Results</h3>
            <span className="ml-auto text-xs text-gray-500 dark:text-zinc-400">{results.length} requests</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-800/40 border-b border-gray-200 dark:border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Endpoint</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Method</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">HTTP Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {results.map((r, i) => (
                <>
                  <tr
                    key={i}
                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                    className="bg-white dark:bg-zinc-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{r.endpoint}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${METHOD_BADGE[r.method] ?? ""}`}>
                        {r.method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${STATUS_BADGE[r.status] ?? STATUS_BADGE.error}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{r.status_code || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{r.latency}ms</td>
                  </tr>
                  {expandedRow === i && r.response_body && (
                    <tr key={`${i}-body`} className="bg-gray-50 dark:bg-zinc-800/30">
                      <td colSpan={5} className="px-4 py-3">
                        <pre className="text-xs text-gray-600 dark:text-zinc-400 overflow-x-auto max-h-40 whitespace-pre-wrap font-mono">
                          {r.response_body}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
