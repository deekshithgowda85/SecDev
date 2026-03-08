"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Globe, Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Loader2, ExternalLink, Shield, Code2, Zap, Sparkles, Square,
  BarChart3, Clock, Activity, ChevronRight, TestTube2,
} from "lucide-react";

/* ── types ────────────────────────────────────────────────────────────────── */

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
interface TestResult {
  route: string;
  status: string;
  status_code: number;
  response_time: number;
  error: string | null;
}
type LayerPhase = "idle" | "running" | "completed" | "failed";
interface LayerState {
  phase: LayerPhase;
  runId: string | null;
  results: TestResult[];
  summary: string | null;
  elapsed: number;
}

/* ── layer definitions ────────────────────────────────────────────────────── */
const LAYERS = [
  {
    id: "suite" as const,
    label: "Route Health",
    description: "HTTP checks on every discovered page route",
    Icon: Globe,
    text: "text-blue-500 dark:text-blue-400",
    bar: "bg-blue-500",
    border: "border-blue-200 dark:border-blue-500/30",
    bg: "bg-blue-50 dark:bg-blue-500/5",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  },
  {
    id: "api" as const,
    label: "API Testing",
    description: "Endpoint validation across GET / POST / PUT / DELETE",
    Icon: Code2,
    text: "text-purple-500 dark:text-purple-400",
    bar: "bg-purple-500",
    border: "border-purple-200 dark:border-purple-500/30",
    bg: "bg-purple-50 dark:bg-purple-500/5",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
  },
  {
    id: "security" as const,
    label: "Security Scan",
    description: "OWASP Top-10 checks — headers, XSS, redirect, cookies",
    Icon: Shield,
    text: "text-red-500 dark:text-red-400",
    bar: "bg-red-500",
    border: "border-red-200 dark:border-red-500/30",
    bg: "bg-red-50 dark:bg-red-500/5",
    badge: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  },
  {
    id: "performance" as const,
    label: "Performance",
    description: "Concurrent load simulation — avg, min, max response times",
    Icon: Zap,
    text: "text-yellow-500 dark:text-yellow-400",
    bar: "bg-yellow-500",
    border: "border-yellow-200 dark:border-yellow-500/30",
    bg: "bg-yellow-50 dark:bg-yellow-500/5",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
  },
];
type LayerId = (typeof LAYERS)[number]["id"];

const initLayer = (): LayerState => ({
  phase: "idle",
  runId: null,
  results: [],
  summary: null,
  elapsed: 0,
});

const DEPLOY_DOT: Record<string, string> = {
  live: "bg-green-500",
  deploying: "bg-yellow-500 animate-pulse",
  failed: "bg-red-500",
};

/* ── animated progress bar ───────────────────────────────────────────────── */
function ProgressBar({ pct, color, animated }: { pct: number; color: string; animated: boolean }) {
  return (
    <div className="w-full h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-[width] duration-700 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ── single layer card ───────────────────────────────────────────────────── */
function LayerCard({ layer, state, index }: { layer: (typeof LAYERS)[number]; state: LayerState; index: number }) {
  const { Icon } = layer;
  const passed = state.results.filter((r) => r.status === "pass").length;
  const failed = state.results.filter((r) => r.status !== "pass").length;
  const total = state.results.length;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const avgTime = total > 0 ? Math.round(state.results.reduce((s, r) => s + r.response_time, 0) / total) : 0;

  const isActive = state.phase === "running";
  const isDone = state.phase === "completed" || state.phase === "failed";

  return (
    <div
      className={`
        rounded-2xl border p-5 transition-all duration-500 shadow-sm
        ${layer.border} ${layer.bg}
        ${state.phase === "idle" ? "opacity-50 scale-[0.98]" : "opacity-100 scale-100"}
        ${isActive ? "ring-2 ring-inset ring-current/20" : ""}
      `}
      style={{ transitionDelay: state.phase === "idle" ? `${index * 60}ms` : "0ms" }}
    >
      {/* header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${layer.bg} border ${layer.border} shrink-0`}>
            <Icon className={`w-4 h-4 ${layer.text}`} />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{layer.label}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{layer.description}</p>
          </div>
        </div>
        {state.phase === "idle" && (
          <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600">Queued</span>
        )}
        {state.phase === "running" && (
          <span className="shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/30">
            <Loader2 className="w-3 h-3 animate-spin" /> Running
          </span>
        )}
        {state.phase === "completed" && (
          <span className="shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30">
            <CheckCircle2 className="w-3 h-3" /> Done
          </span>
        )}
        {state.phase === "failed" && (
          <span className="shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        )}
      </div>

      {/* progress */}
      <ProgressBar
        pct={isActive ? 60 : isDone ? (pct || (state.phase === "completed" ? 100 : 0)) : 0}
        color={layer.bar}
        animated={isActive}
      />

      {/* stats */}
      {isDone && total > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{passed}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Passed</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-500">{failed}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Failed</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{avgTime}ms</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Avg</p>
          </div>
        </div>
      )}

      {/* running skeleton */}
      {isActive && (
        <div className="mt-4 space-y-2">
          {[40, 60, 50].map((w, i) => (
            <div key={i} className="flex items-center gap-2 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
              <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-zinc-700 shrink-0" />
              <div className={`h-2 ${layer.bar} opacity-20 rounded-full`} style={{ width: `${w}%` }} />
              <div className="ml-auto h-2 w-10 bg-gray-200 dark:bg-zinc-700 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* summary + elapsed */}
      {isDone && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-800 space-y-1">
          {state.summary && <p className="text-xs text-gray-500 dark:text-zinc-500">{state.summary}</p>}
          {state.elapsed > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-600">
              <Clock className="w-3 h-3" /> {(state.elapsed / 1000).toFixed(1)}s
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── results table ───────────────────────────────────────────────────────── */
function ResultsTable({ results }: { results: TestResult[] }) {
  if (results.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
            {["Route", "Status", "Code", "Time", "Error"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
          {results.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-900/30 transition-colors">
              <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-zinc-300">{r.route}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                  r.status === "pass"
                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                    : r.status === "error"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                }`}>
                  {r.status === "pass" ? <CheckCircle2 className="w-3 h-3" /> : r.status === "error" ? <AlertTriangle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-zinc-400">{r.status_code || "—"}</td>
              <td className="px-4 py-2.5 text-xs">
                <span className={r.response_time > 1000 ? "text-red-500" : r.response_time > 500 ? "text-yellow-500" : "text-green-500"}>
                  {r.response_time}ms
                </span>
              </td>
              <td className="px-4 py-2.5 text-xs text-red-500 max-w-xs truncate">{r.error ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── main page ───────────────────────────────────────────────────────────── */
export default function Page() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedSandbox, setSelectedSandbox] = useState<string>("");
  const [layerStates, setLayerStates] = useState<Record<LayerId, LayerState>>({
    suite: initLayer(), api: initLayer(), security: initLayer(), performance: initLayer(),
  });
  const [running, setRunning] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [activeResultLayer, setActiveResultLayer] = useState<LayerId | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef(false);

  const selectedDeployment = deployments.find((d) => d.sandboxId === selectedSandbox);

  useEffect(() => {
    fetch("/api/deploy")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const all = (d.deployments ?? []).filter((dep: Deployment) => dep.status !== "failed");
          setDeployments(all);
          if (all.length > 0) setSelectedSandbox((p) => p || all[0].sandboxId);
        }
      })
      .catch(() => null);
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!selectedSandbox) return;
    try {
      const res = await fetch(`/api/tests/run?sandboxId=${selectedSandbox}`);
      const d = await res.json();
      if (d.ok) setRuns(d.runs ?? []);
    } catch { /* ignore */ }
  }, [selectedSandbox]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const setLayer = (id: LayerId, patch: Partial<LayerState>) =>
    setLayerStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const pollRun = useCallback(async (runId: string, layerId: LayerId): Promise<boolean> => {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (abortRef.current) return false;
      await new Promise((r) => setTimeout(r, 4000));
      try {
        const res = await fetch(`/api/tests/run?sandboxId=${selectedSandbox}&type=${layerId}`);
        const d = await res.json();
        const run: TestRun | undefined = (d.runs ?? []).find((r: TestRun) => r.id === runId);
        if (!run) continue;
        if (run.status === "completed" || run.status === "failed") {
          const rRes = await fetch(`/api/tests/results?runId=${runId}`);
          const rData = await rRes.json();
          setLayer(layerId, {
            phase: run.status as LayerPhase,
            results: rData.results ?? [],
            summary: run.summary,
            elapsed: run.finishedAt ? run.finishedAt - run.createdAt : 0,
          });
          return run.status === "completed";
        }
      } catch { /* retry */ }
    }
    setLayer(layerId, { phase: "failed", summary: "Timed out" });
    return false;
  }, [selectedSandbox]); // eslint-disable-line react-hooks/exhaustive-deps

  const runLayer = useCallback(async (layerId: LayerId): Promise<boolean> => {
    if (abortRef.current) return false;
    setLayer(layerId, { phase: "running", runId: null, results: [], summary: null, elapsed: 0 });
    try {
      const res = await fetch("/api/tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId: selectedSandbox, type: layerId }),
      });
      const d = await res.json();
      if (!d.ok) { setLayer(layerId, { phase: "failed", summary: d.error ?? "Failed to start" }); return false; }
      setLayer(layerId, { runId: d.runId });
      return await pollRun(d.runId, layerId);
    } catch (err) {
      setLayer(layerId, { phase: "failed", summary: String(err) });
      return false;
    }
  }, [selectedSandbox, pollRun]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRunAll = useCallback(async () => {
    if (!selectedSandbox) { setDeployError("Select a deployment first."); return; }
    if (selectedDeployment?.status !== "live") { setDeployError("Deployment must be live to run tests."); return; }
    setDeployError(null);
    setAllDone(false);
    setAnalysis(null);
    setActiveResultLayer(null);
    abortRef.current = false;
    setRunning(true);
    setLayerStates({ suite: initLayer(), api: initLayer(), security: initLayer(), performance: initLayer() });
    for (const layer of LAYERS) {
      if (abortRef.current) break;
      await runLayer(layer.id);
    }
    setRunning(false);
    setAllDone(true);
    fetchHistory();
  }, [selectedSandbox, selectedDeployment, runLayer, fetchHistory]);

  const handleStop = () => { abortRef.current = true; setRunning(false); };

  const handleAnalyze = async () => {
    const runId = Object.values(layerStates).find((s) => s.runId)?.runId;
    if (!runId) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/tests/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      const d = await res.json();
      if (d.ok) setAnalysis(d.analysis);
    } catch { /* ignore */ }
    setAnalyzing(false);
  };

  const allResults = LAYERS.flatMap((l) => layerStates[l.id].results);
  const totalPassed = allResults.filter((r) => r.status === "pass").length;
  const totalFailed = allResults.filter((r) => r.status !== "pass").length;
  const totalTests = allResults.length;
  const overallScore = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : null;
  const completedLayers = LAYERS.filter((l) => layerStates[l.id].phase === "completed").length;
  const failedLayers = LAYERS.filter((l) => layerStates[l.id].phase === "failed").length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── header ── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-500/15">
              <TestTube2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Test Suite Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Layered analysis — Route Health · API Coverage · Security · Performance
          </p>
        </div>
        <button
          onClick={() => { setShowHistory((p) => !p); fetchHistory(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <Activity className="w-3.5 h-3.5" /> History
        </button>
      </div>

      {/* ── deployment selector ── */}
      <div className="mb-6 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-3">
          Target Deployment
        </label>
        {deployments.length === 0 ? (
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            No live deployments. Go to{" "}
            <Link href="/console/deployments" className="underline">Deployments</Link> to deploy first.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedSandbox}
                onChange={(e) => setSelectedSandbox(e.target.value)}
                disabled={running}
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
              >
                {deployments.map((d) => (
                  <option key={d.sandboxId} value={d.sandboxId}>
                    [{d.status.toUpperCase()}] {d.repoName} — {d.sandboxId.slice(0, 12)}
                  </option>
                ))}
              </select>
              {!running ? (
                <button
                  onClick={handleRunAll}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                >
                  <Play className="w-4 h-4" /> Run All Tests
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
                >
                  <Square className="w-4 h-4 fill-current" /> Stop
                </button>
              )}
              <button
                onClick={fetchHistory}
                title="Refresh"
                className="flex items-center justify-center w-9 h-9 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {selectedDeployment && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${DEPLOY_DOT[selectedDeployment.status] ?? "bg-gray-400"}`} />
                  <span className="font-medium text-gray-700 dark:text-zinc-300">{selectedDeployment.status}</span>
                </span>
                <span className="text-gray-300 dark:text-zinc-700">·</span>
                <a href={selectedDeployment.publicUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-mono truncate max-w-xs">
                  {selectedDeployment.publicUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
          </div>
        )}
        {deployError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{deployError}</p>}
      </div>

      {/* ── overall score (once all done) ── */}
      {allDone && overallScore !== null && (
        <div className="mb-6 p-5 rounded-2xl border bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 border-indigo-200 dark:border-indigo-500/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Overall Health Score</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-indigo-700 dark:text-indigo-300">{overallScore}</span>
                <span className="text-xl text-indigo-400 mb-1">/100</span>
              </div>
              <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                {totalPassed} passed · {totalFailed} failed across {LAYERS.length} layers
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: "Layers OK", value: completedLayers, color: "text-green-600 dark:text-green-400" },
                { label: "Layers Failed", value: failedLayers, color: "text-red-500" },
                { label: "Total Checks", value: totalTests, color: "text-gray-900 dark:text-white" },
              ].map((s) => (
                <div key={s.label} className="text-center px-4 py-2 rounded-xl bg-white/70 dark:bg-white/5 border border-indigo-200 dark:border-indigo-500/20">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors disabled:opacity-50"
            >
              {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {analyzing ? "Analyzing…" : "AI Analysis & Recommendations"}
            </button>
            <button
              onClick={handleRunAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-run All
            </button>
          </div>
        </div>
      )}

      {/* ── 4-layer cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {LAYERS.map((layer, i) => (
          <LayerCard key={layer.id} layer={layer} state={layerStates[layer.id]} index={i} />
        ))}
      </div>

      {/* ── collapsible per-layer results ── */}
      {allDone && (
        <div className="space-y-3 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Detailed Results
          </h2>
          {LAYERS.map((layer) => {
            const s = layerStates[layer.id];
            if (s.results.length === 0) return null;
            const { Icon } = layer;
            const passed = s.results.filter((r) => r.status === "pass").length;
            const open = activeResultLayer === layer.id;
            return (
              <div key={layer.id} className="rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                <button
                  onClick={() => setActiveResultLayer(open ? null : layer.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${layer.text}`} />
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{layer.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${layer.badge}`}>
                      {passed}/{s.results.length} passed
                    </span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
                </button>
                {open && (
                  <div className="p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <ResultsTable results={s.results} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── AI analysis ── */}
      {analysis && (
        <div className="mb-8 p-5 rounded-2xl border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="font-semibold text-purple-800 dark:text-purple-300 text-sm">AI Analysis & Recommendations</h3>
          </div>
          <div className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{analysis}</div>
        </div>
      )}

      {/* ── history ── */}
      {showHistory && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4" /> Run History
              {runs.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded-full">{runs.length}</span>
              )}
            </h2>
            <button onClick={fetchHistory} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
          <div className="space-y-2">
            {runs.length === 0 && (
              <p className="text-center py-8 text-gray-400 dark:text-zinc-600 text-sm">No previous runs found.</p>
            )}
            {runs.map((run) => (
              <div key={run.id} className="p-3.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {run.status === "running" ? <Loader2 className="w-4 h-4 text-yellow-500 animate-spin shrink-0" />
                    : run.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {run.type} — {new Date(run.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
                      {run.summary ?? (run.status === "running" ? "Running…" : "No summary")}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 px-2 py-1 text-xs font-medium rounded-md border ${
                  run.status === "running" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20"
                    : run.status === "completed" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                }`}>
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
