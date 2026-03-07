"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3, Play, RefreshCw, CheckCircle2, XCircle,
  Sparkles, Loader2, TrendingUp, TrendingDown, Activity, ExternalLink, Download, Square,
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

interface PerfResult {
  route: string;
  avg_response: number;
  max_response: number;
  min_response: number;
  concurrent_requests: number;
  success_rate: number;
}

function latencyColor(ms: number): string {
  if (ms < 200) return "text-green-600 dark:text-green-400";
  if (ms < 500) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function successColor(rate: number): string {
  if (rate >= 0.95) return "text-green-600 dark:text-green-400";
  if (rate >= 0.8) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export default function Page() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedSandbox, setSelectedSandbox] = useState<string>("");
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [results, setResults] = useState<PerfResult[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
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

  const fetchRuns = useCallback(async () => {
    if (!selectedSandbox) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/run?sandboxId=${selectedSandbox}&type=performance`);
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
    fetchRuns();
  }, [fetchRuns]);

  const fetchResults = async (runId: string) => {
    setSelectedRun(runId);
    setAnalysis(null);
    try {
      const res = await fetch(`/api/tests/results?runId=${runId}`);
      const data = await res.json();
      if (data.ok) setResults(data.results ?? []);
    } catch { /* ignore */ }
  };

  const handleRun = async () => {
    if (!selectedSandbox) { setDeployError("Select a deployment first."); return; }
    if (selectedDeployment?.status !== "live") { setDeployError("Deployment must be live to run load tests."); return; }
    setDeployError(null);
    setRunning(true);
    try {
      const res = await fetch("/api/tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId: selectedSandbox, type: "performance" }),
      });
      const data = await res.json();
      if (data.ok) {
        setTimeout(fetchRuns, 1000);
        setTimeout(fetchRuns, 5000);
        setTimeout(fetchRuns, 20000);
      } else {
        setDeployError(data.error ?? "Failed to start load test");
      }
    } catch { setDeployError("Network error."); }
    setRunning(false);
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

  const handleDownload = async (runId: string) => {
    try {
      const res = await fetch(`/api/tests/results?runId=${runId}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `performance-results-${runId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (runs.some((r) => r.status === "running")) {
      const interval = setInterval(fetchRuns, 5000);
      return () => clearInterval(interval);
    }
  }, [runs, fetchRuns]);

  // Aggregate stats
  const avgAll = results.length > 0
    ? Math.round(results.reduce((a, b) => a + b.avg_response, 0) / results.length)
    : 0;
  const maxAll = results.length > 0 ? Math.max(...results.map((r) => r.max_response)) : 0;
  const avgSuccess = results.length > 0
    ? Math.round(results.reduce((a, b) => a + b.success_rate, 0) / results.length * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> Performance
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Load simulation and response time analysis
        </p>
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
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors disabled:opacity-60"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {running ? "Starting…" : "Run Load Test"}
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

      {/* Performance stats cards */}
      {selectedRun && results.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase flex items-center gap-1">
              <Activity className="w-3 h-3" /> Avg Response
            </p>
            <p className={`text-2xl font-bold mt-1 ${latencyColor(avgAll)}`}>{avgAll}ms</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Max Response
            </p>
            <p className={`text-2xl font-bold mt-1 ${latencyColor(maxAll)}`}>{maxAll}ms</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Success Rate
            </p>
            <p className={`text-2xl font-bold mt-1 ${successColor(avgSuccess / 100)}`}>{avgSuccess}%</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">Routes Tested</p>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{results.length}</p>
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
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No performance tests yet. Select a deployment and click &quot;Run Load Test&quot;.</p>
          </div>
        )}
        {runs.map((run) => (
          <div
            key={run.id}
            onClick={() => run.status === "completed" && fetchResults(run.id)}
            className={`p-4 rounded-xl border transition-all ${
              selectedRun === run.id
                ? "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-500/5"
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
                    Load Test — {new Date(run.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    {run.summary ?? (run.status === "running" ? "Running load test…" : "No summary")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {run.status === "running" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStop(run.id); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                  >
                    <Square className="w-3 h-3 fill-current" /> Stop
                  </button>
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
            <Sparkles className="w-4 h-4" /> AI Performance Analysis
          </h3>
          <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">{analysis}</p>
        </div>
      )}

      {/* Results table */}
      {selectedRun && results.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Route</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Avg</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Min</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Max</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Success Rate</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Concurrency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {results.map((r, i) => (
                <tr key={i} className="bg-white dark:bg-zinc-900">
                  <td className="px-4 py-3 font-mono text-xs">{r.route}</td>
                  <td className={`px-4 py-3 font-semibold ${latencyColor(r.avg_response)}`}>{r.avg_response}ms</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{r.min_response}ms</td>
                  <td className={`px-4 py-3 ${latencyColor(r.max_response)}`}>{r.max_response}ms</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${r.success_rate >= 0.95 ? "bg-green-500" : r.success_rate >= 0.8 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${r.success_rate * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${successColor(r.success_rate)}`}>
                        {Math.round(r.success_rate * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{r.concurrent_requests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
