"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield, Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Sparkles, Loader2, ExternalLink,
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

export default function Page() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedSandbox, setSelectedSandbox] = useState<string>("");
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [results, setResults] = useState<SecurityResult[]>([]);
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
      const res = await fetch(`/api/tests/run?sandboxId=${selectedSandbox}&type=security`);
      const data = await res.json();
      if (data.ok) setRuns(data.runs ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedSandbox]);

  useEffect(() => {
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
    if (selectedDeployment?.status !== "live") { setDeployError("Deployment must be live to run a scan."); return; }
    setDeployError(null);
    setRunning(true);
    try {
      const res = await fetch("/api/tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId: selectedSandbox, type: "security" }),
      });
      const data = await res.json();
      if (data.ok) {
        setTimeout(fetchRuns, 1000);
        setTimeout(fetchRuns, 5000);
        setTimeout(fetchRuns, 15000);
      } else {
        setDeployError(data.error ?? "Failed to start scan");
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

  useEffect(() => {
    if (runs.some((r) => r.status === "running")) {
      const interval = setInterval(fetchRuns, 5000);
      return () => clearInterval(interval);
    }
  }, [runs, fetchRuns]);

  // Stats
  const critCount = results.filter((r) => r.severity === "critical" && r.result === "fail").length;
  const highCount = results.filter((r) => r.severity === "high" && r.result === "fail").length;
  const passCount = results.filter((r) => r.result === "pass").length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6" /> Security Scans
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          OWASP-style vulnerability checks on deployed routes
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
            <a href="/console/deployments" className="underline">Deployments</a> page.
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
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-colors disabled:opacity-60"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {running ? "Starting…" : "Run Scan"}
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

      {/* Severity stats */}
      {selectedRun && results.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Critical", count: critCount, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
            { label: "High", count: highCount, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20" },
            { label: "Passed", count: passCount, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20" },
            { label: "Total Checks", count: results.length, color: "text-gray-600 dark:text-zinc-400", bg: "bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700" },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`p-4 rounded-xl border ${bg}`}>
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Runs list */}
      <div className="space-y-3 mb-8">
        {runs.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400 dark:text-zinc-500">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No security scans yet. Select a deployment and click &quot;Run Scan&quot;.</p>
          </div>
        )}
        {runs.map((run) => (
          <div
            key={run.id}
            onClick={() => run.status === "completed" && fetchResults(run.id)}
            className={`p-4 rounded-xl border transition-all ${
              selectedRun === run.id
                ? "border-red-300 dark:border-red-500/50 bg-red-50/50 dark:bg-red-500/5"
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
                    Security Scan — {new Date(run.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    {run.summary ?? (run.status === "running" ? "Scanning…" : "No summary")}
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
            <Sparkles className="w-4 h-4" /> AI Security Analysis
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
                    {r.result === "pass" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${SEVERITY_BADGE[r.severity] ?? SEVERITY_BADGE.info}`}>
                      {r.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400 max-w-sm truncate">{r.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
