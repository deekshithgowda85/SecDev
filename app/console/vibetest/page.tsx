"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Globe, Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Sparkles, Loader2, ExternalLink, Link2, Terminal, Eye, LayoutDashboard, Download, Square,
} from "lucide-react";

const DEPLOY_STATUS_BADGE: Record<string, string> = {
  live: "bg-green-500",
  deploying: "bg-yellow-500 animate-pulse",
  failed: "bg-red-500",
};

const STATUS_BADGE: Record<string, string> = {
  pass: "bg-green-100 text-green-800 border-green-300 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30",
  fail: "bg-red-100 text-red-800 border-red-300 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
};

const AGENT_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  links: { label: "Link Checker", icon: Link2, color: "text-blue-600 dark:text-blue-400" },
  console: { label: "Console Errors", icon: Terminal, color: "text-orange-600 dark:text-orange-400" },
  a11y: { label: "Accessibility", icon: Eye, color: "text-purple-600 dark:text-purple-400" },
  ui: { label: "UI Bugs", icon: LayoutDashboard, color: "text-teal-600 dark:text-teal-400" },
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

interface VibetestResult {
  id: number;
  run_id: string;
  sandbox_id: string;
  agent: string;
  category: string;
  status: string;
  finding: string;
  detail: string | null;
  url: string | null;
  created_at: number;
}

export default function Page() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedSandbox, setSelectedSandbox] = useState<string>("");
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [results, setResults] = useState<VibetestResult[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<string>("links");
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
      const res = await fetch(`/api/tests/run?sandboxId=${selectedSandbox}&type=vibetest`);
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
      const res = await fetch(`/api/tests/results?runId=${runId}&type=vibetest`);
      const data = await res.json();
      if (data.ok) {
        setResults(data.results ?? []);
        setActiveAgent("links");
      }
    } catch { /* ignore */ }
  };

  const handleRun = async () => {
    if (!selectedSandbox) { setDeployError("Select a deployment first."); return; }
    if (selectedDeployment?.status !== "live") {
      setDeployError("Deployment must be live to run Vibetest. Wait for it to finish deploying.");
      return;
    }
    setDeployError(null);
    setRunning(true);
    try {
      const res = await fetch("/api/tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId: selectedSandbox, type: "vibetest" }),
      });
      const data = await res.json();
      if (data.ok) {
        setTimeout(fetchRuns, 1000);
        setTimeout(fetchRuns, 10000);
        setTimeout(fetchRuns, 30000);
        setTimeout(fetchRuns, 60000);
      } else {
        setDeployError(data.error ?? "Failed to start Vibetest");
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

  const handleDownload = async (runId: string) => {
    try {
      const res = await fetch(`/api/tests/results?runId=${runId}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vibetest-results-${runId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
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

  useEffect(() => {
    if (runs.some((r) => r.status === "running")) {
      const interval = setInterval(fetchRuns, 8000);
      return () => clearInterval(interval);
    }
  }, [runs, fetchRuns]);

  // Group results by agent
  const byAgent = (agent: string) => results.filter((r) => r.agent === agent);
  const agents = ["links", "console", "a11y", "ui"] as const;

  // Summary counts
  const failCount = results.filter((r) => r.status === "fail").length;
  const warnCount = results.filter((r) => r.status === "warning").length;
  const passCount = results.filter((r) => r.status === "pass").length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Globe className="w-6 h-6" /> Vibetest
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Automated browser agents: link checker, console errors, accessibility &amp; UI bug detection
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
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-colors disabled:opacity-60"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {running ? "Starting…" : "Run Vibetest"}
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

      {/* Stats (only when a run is selected and has results) */}
      {selectedRun && results.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Failures", count: failCount, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
            { label: "Warnings", count: warnCount, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20" },
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

      {/* History header */}
      {runs.length > 0 && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wide">
            History
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded-full">
              {runs.length} run{runs.length !== 1 ? "s" : ""}
            </span>
          </h2>
        </div>
      )}

      {/* Runs list */}
      <div className="space-y-3 mb-8">
        {runs.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400 dark:text-zinc-500">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No Vibetest runs yet. Select a live deployment and click &quot;Run Vibetest&quot;.</p>
            <p className="text-xs mt-2 opacity-75">Note: First run installs Playwright (~3–5 min) then runs 4 browser agents.</p>
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
                    Vibetest — {new Date(run.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    {run.summary ?? (run.status === "running" ? "Running browser agents (may take 5–10 min)…" : "No summary")}
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
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  run.status === "running" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400" :
                  run.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" :
                  "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
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
        <div className="mb-8 p-4 rounded-xl border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/5">
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> AI Analysis
          </p>
          <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">{analysis}</p>
        </div>
      )}

      {/* Results by agent (shown when a run is selected) */}
      {selectedRun && results.length > 0 && (
        <div>
          {/* Agent tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
            {agents.map((agent) => {
              const meta = AGENT_META[agent];
              const Icon = meta.icon;
              const agentResults = byAgent(agent);
              const hasFail = agentResults.some((r) => r.status === "fail");
              const hasWarn = agentResults.some((r) => r.status === "warning");
              return (
                <button
                  key={agent}
                  onClick={() => setActiveAgent(agent)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    activeAgent === agent
                      ? "bg-white dark:bg-zinc-900 shadow text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${activeAgent === agent ? meta.color : ""}`} />
                  <span className="hidden sm:inline">{meta.label}</span>
                  {hasFail && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  )}
                  {!hasFail && hasWarn && (
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Agent results panel */}
          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-2">
              {(() => {
                const meta = AGENT_META[activeAgent];
                const Icon = meta.icon;
                return (
                  <>
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{meta.label}</h3>
                    <span className="ml-auto text-xs text-gray-500 dark:text-zinc-400">
                      {byAgent(activeAgent).length} findings
                    </span>
                  </>
                );
              })()}
            </div>

            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              {byAgent(activeAgent).length === 0 && (
                <div className="p-6 text-center text-sm text-gray-400 dark:text-zinc-500">
                  No results for this agent.
                </div>
              )}
              {byAgent(activeAgent).map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {r.status === "pass" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : r.status === "warning" ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className={`text-xs px-1.5 py-0.5 border rounded font-mono ${STATUS_BADGE[r.status] ?? STATUS_BADGE.pass}`}>
                        {r.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {r.finding}
                      </span>
                    </div>
                    {r.detail && (
                      <p className="text-xs text-gray-500 dark:text-zinc-400 break-words">{r.detail}</p>
                    )}
                    {r.url && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 truncate">
                        {r.url}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
