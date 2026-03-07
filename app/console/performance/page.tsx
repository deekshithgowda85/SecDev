"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3, Play, RefreshCw, CheckCircle2, XCircle,
  Sparkles, Loader2, TrendingUp, TrendingDown, Activity,
} from "lucide-react";

interface Deployment {
  sandboxId: string;
  repoName: string;
  status: string;
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

  useEffect(() => {
    fetch("/api/deploy")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const live = (d.deployments ?? []).filter((dep: Deployment) => dep.status === "live");
          setDeployments(live);
          if (live.length > 0 && !selectedSandbox) setSelectedSandbox(live[0].sandboxId);
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

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

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
    if (!selectedSandbox) return;
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
      }
    } catch { /* ignore */ }
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Performance
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Load simulation and response time analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedSandbox}
            onChange={(e) => setSelectedSandbox(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
          >
            {deployments.length === 0 && <option value="">No live deployments</option>}
            {deployments.map((d) => (
              <option key={d.sandboxId} value={d.sandboxId}>
                {d.repoName} ({d.sandboxId.slice(0, 8)})
              </option>
            ))}
          </select>
          <button
            onClick={handleRun}
            disabled={running || !selectedSandbox}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Load Test
          </button>
          <button
            onClick={fetchRuns}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
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
                {run.status === "completed" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAnalyze(run.id); }}
                    disabled={analyzing}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" /> AI Analyze
                  </button>
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
