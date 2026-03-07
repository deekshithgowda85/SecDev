"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TestTube2, Play, RefreshCw, CheckCircle2, XCircle,
  Clock, Globe, Sparkles, Loader2,
} from "lucide-react";

interface Deployment {
  sandboxId: string;
  repoName: string;
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

interface TestResult {
  route: string;
  status: string;
  status_code: number;
  response_time: number;
  error: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  pass: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
  fail: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  error: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20",
};

export default function Page() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedSandbox, setSelectedSandbox] = useState<string>("");
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
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
      const res = await fetch(`/api/tests/run?sandboxId=${selectedSandbox}&type=suite`);
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
        body: JSON.stringify({ sandboxId: selectedSandbox, type: "suite" }),
      });
      const data = await res.json();
      if (data.ok) {
        setTimeout(fetchRuns, 1000);
        setTimeout(fetchRuns, 5000);
        setTimeout(fetchRuns, 15000);
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

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TestTube2 className="w-6 h-6" /> Test Suite
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            HTTP health checks on all discovered routes
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
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Tests
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

      {/* Runs list */}
      <div className="space-y-3 mb-8">
        {runs.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400 dark:text-zinc-500">
            <TestTube2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No test runs yet. Select a deployment and click &quot;Run Tests&quot;.</p>
          </div>
        )}
        {runs.map((run) => (
          <div
            key={run.id}
            onClick={() => run.status === "completed" && fetchResults(run.id)}
            className={`p-4 rounded-xl border transition-all ${
              selectedRun === run.id
                ? "border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/5"
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
                    Test Run — {new Date(run.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    {run.summary ?? (run.status === "running" ? "Running…" : "No summary")}
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
            <Sparkles className="w-4 h-4" /> AI Analysis
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">HTTP Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Response Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {results.map((r, i) => (
                <tr key={i} className="bg-white dark:bg-zinc-900">
                  <td className="px-4 py-3 font-mono text-xs">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-gray-400" />
                      {r.route}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${STATUS_BADGE[r.status] ?? STATUS_BADGE.error}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{r.status_code || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-600 dark:text-zinc-400">
                      <Clock className="w-3 h-3" /> {r.response_time}ms
                    </span>
                  </td>
                  <td className="px-4 py-3 text-red-500 text-xs max-w-xs truncate">{r.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
