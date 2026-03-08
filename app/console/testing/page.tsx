"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Globe, Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Loader2, ExternalLink, Shield, Code2, Zap, Sparkles, Square,
  BarChart3, Clock, Activity, ChevronRight, TestTube2, Eye,
  Download, Copy, Check,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

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
  route?: string;
  endpoint?: string;
  method?: string;
  status: string;
  status_code?: number;
  response_time?: number;
  latency?: number;
  error?: string | null;
  check_type?: string;
  result?: string;
  details?: string;
  severity?: string;
  avg_response?: number;
  max_response?: number;
  min_response?: number;
  success_rate?: number;
  agent?: string;
  category?: string;
  finding?: string;
  detail?: string;
  url?: string;
}
interface LogLine {
  id: number;
  level: string;
  message: string;
  created_at: number;
}
type LayerPhase = "idle" | "running" | "completed" | "failed";
interface LayerState {
  phase: LayerPhase;
  runId: string | null;
  results: TestResult[];
  summary: string | null;
  elapsed: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LAYER DEFINITIONS — all 5 test types
   ═══════════════════════════════════════════════════════════════════════════ */

const LAYERS = [
  {
    id: "suite" as const,
    label: "Route Health",
    description: "HTTP checks on every discovered page route",
    Icon: Globe,
    text: "text-gray-600 dark:text-zinc-400",
    bar: "bg-gray-900 dark:bg-zinc-200",
    border: "border-gray-200 dark:border-zinc-700",
    bg: "bg-gray-50 dark:bg-zinc-800/50",
    badge: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300",
    ring: "ring-gray-300/50",
    glow: "shadow-gray-100",
  },
  {
    id: "api" as const,
    label: "API Testing",
    description: "Endpoint validation across GET / POST / PUT / DELETE",
    Icon: Code2,
    text: "text-gray-600 dark:text-zinc-400",
    bar: "bg-gray-900 dark:bg-zinc-200",
    border: "border-gray-200 dark:border-zinc-700",
    bg: "bg-gray-50 dark:bg-zinc-800/50",
    badge: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300",
    ring: "ring-gray-300/50",
    glow: "shadow-gray-100",
  },
  {
    id: "security" as const,
    label: "Security Scan",
    description: "OWASP Top-10 — headers, XSS, redirects, cookies",
    Icon: Shield,
    text: "text-gray-600 dark:text-zinc-400",
    bar: "bg-gray-900 dark:bg-zinc-200",
    border: "border-gray-200 dark:border-zinc-700",
    bg: "bg-gray-50 dark:bg-zinc-800/50",
    badge: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300",
    ring: "ring-gray-300/50",
    glow: "shadow-gray-100",
  },
  {
    id: "performance" as const,
    label: "Performance",
    description: "Concurrent load simulation — avg / min / max latency",
    Icon: Zap,
    text: "text-gray-600 dark:text-zinc-400",
    bar: "bg-gray-900 dark:bg-zinc-200",
    border: "border-gray-200 dark:border-zinc-700",
    bg: "bg-gray-50 dark:bg-zinc-800/50",
    badge: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300",
    ring: "ring-gray-300/50",
    glow: "shadow-gray-100",
  },
  {
    id: "vibetest" as const,
    label: "Vibetest",
    description: "Browser agent — link crawl, console errors, a11y audit",
    Icon: Eye,
    text: "text-gray-600 dark:text-zinc-400",
    bar: "bg-gray-900 dark:bg-zinc-200",
    border: "border-gray-200 dark:border-zinc-700",
    bg: "bg-gray-50 dark:bg-zinc-800/50",
    badge: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300",
    ring: "ring-gray-300/50",
    glow: "shadow-gray-100",
  },
] as const;

type LayerId = (typeof LAYERS)[number]["id"];

const ALL_LAYER_IDS = LAYERS.map((l) => l.id);

const initLayer = (): LayerState => ({
  phase: "idle",
  runId: null,
  results: [],
  summary: null,
  elapsed: 0,
});

const initAllLayers = (): Record<LayerId, LayerState> =>
  Object.fromEntries(ALL_LAYER_IDS.map((id) => [id, initLayer()])) as Record<LayerId, LayerState>;

const DEPLOY_DOT: Record<string, string> = {
  live: "bg-green-500",
  deploying: "bg-yellow-500 animate-pulse",
  failed: "bg-red-500",
};

const LOG_COLORS: Record<string, string> = {
  info:    "text-blue-400",
  success: "text-green-400",
  warn:    "text-yellow-400",
  error:   "text-red-400",
};

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── countdown / elapsed timer ─────────────────────────────────────────── */
function ElapsedTimer({ startMs }: { startMs: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sec = Math.max(0, Math.round((now - startMs) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return (
    <span className="font-mono text-xs tabular-nums">
      {m > 0 ? `${m}m ` : ""}{s}s
    </span>
  );
}

/* ── per-step detail panel (shows below active timeline node) ─────────── */
function StepDetailPanel({
  layer,
  state,
  logs,
  startTime,
}: {
  layer: (typeof LAYERS)[number];
  state: LayerState;
  logs: LogLine[];
  startTime: number;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const { Icon } = layer;
  const passed = state.results.filter((r) => r.status === "pass" || r.result === "pass").length;
  const total = state.results.length;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const isActive = state.phase === "running";
  const isDone = state.phase === "completed" || state.phase === "failed";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className={`rounded-2xl border overflow-hidden ${layer.border} bg-white dark:bg-zinc-900 shadow-sm`}>
      {/* header */}
      <div className={`flex items-center justify-between px-4 py-3 ${layer.bg} border-b ${layer.border}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${layer.border}`}>
            <Icon className={`w-4 h-4 ${layer.text}`} />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{layer.label}</p>
            <p className="text-[11px] text-gray-500 dark:text-zinc-500">{layer.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs shrink-0">
          {isActive && startTime > 0 && (
            <span className="flex items-center gap-1 text-gray-400 dark:text-zinc-500">
              <Clock className="w-3 h-3" />
              <ElapsedTimer startMs={startTime} />
            </span>
          )}
          {isDone && total > 0 && (
            <>
              <span className="text-green-600 dark:text-green-400 font-semibold">{passed} passed</span>
              <span className="text-red-500 font-semibold">{total - passed} failed</span>
              <span className="font-bold text-gray-900 dark:text-white">{pct}%</span>
            </>
          )}
          {state.phase === "idle" && <span className="text-gray-300 dark:text-zinc-700">Waiting…</span>}
          {isActive && (
            <span className="flex items-center gap-1 text-yellow-500 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Running
            </span>
          )}
          {state.phase === "completed" && total === 0 && (
            <span className="flex items-center gap-1 text-green-500">
              <CheckCircle2 className="w-3 h-3" /> Done
            </span>
          )}
          {state.phase === "failed" && total === 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <XCircle className="w-3 h-3" /> Failed
            </span>
          )}
        </div>
      </div>

      {/* progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-zinc-800">
        <div
          className={`h-full ${layer.bar} transition-[width] duration-700 ease-out`}
          style={{ width: isActive ? "55%" : isDone ? `${pct || (state.phase === "completed" ? 100 : 5)}%` : "0%" }}
        />
      </div>

      {/* terminal output */}
      <div className="bg-gray-950">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-black/20">
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          </div>
          <span className="ml-2 text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
            {layer.label} — output
          </span>
          {logs.length > 0 && (
            <span className="ml-auto text-[10px] text-zinc-700 font-mono">{logs.length} lines</span>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-0.5">
          {logs.length === 0 && state.phase === "idle" && (
            <p className="text-zinc-700 italic">Layer not started yet…</p>
          )}
          {logs.length === 0 && isActive && (
            <div className="flex items-center gap-2 text-zinc-600 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Waiting for output…
            </div>
          )}
          {logs.length === 0 && isDone && (
            <p className="text-zinc-700 italic">No log output captured for this layer.</p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex gap-2 hover:bg-white/5 rounded px-1 -mx-1 py-px">
              <span className="text-zinc-700 shrink-0 tabular-nums select-none w-20">
                {new Date(Number(log.created_at)).toLocaleTimeString()}
              </span>
              <span className={`shrink-0 uppercase font-bold w-10 ${LOG_COLORS[log.level] ?? "text-gray-400"}`}>
                {log.level}
              </span>
              <span className="text-gray-300 break-all">{log.message}</span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* summary footer */}
      {isDone && state.summary && (
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
          <p className="text-[11px] text-gray-500 dark:text-zinc-400 flex items-start gap-1.5">
            <span className="flex-1">{state.summary}</span>
            {state.elapsed > 0 && (
              <span className="text-gray-400 dark:text-zinc-600 flex items-center gap-0.5 shrink-0">
                <Clock className="w-2.5 h-2.5" />
                {(state.elapsed / 1000).toFixed(1)}s
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── results table (generic) ───────────────────────────────────────────── */
function ResultsTable({ results, type }: { results: TestResult[]; type: string }) {
  if (results.length === 0) return null;

  if (type === "suite") {
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
              {["Route", "Status", "Code", "Time", "Error"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {results.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-900/30">
                <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-zinc-300">{r.route ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 dark:text-zinc-400">{r.status_code || "—"}</td>
                <td className="px-3 py-2 text-xs">
                  <TimeBadge ms={r.response_time ?? 0} />
                </td>
                <td className="px-3 py-2 text-xs text-red-500 max-w-xs truncate">{r.error ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === "api") {
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
              {["Endpoint", "Method", "Status", "Code", "Latency"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {results.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-900/30">
                <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-zinc-300">{r.endpoint ?? "—"}</td>
                <td className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-zinc-400">{r.method ?? "—"}</td>
                <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2 text-xs text-gray-600 dark:text-zinc-400">{r.status_code || "—"}</td>
                <td className="px-3 py-2 text-xs"><TimeBadge ms={r.latency ?? 0} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === "security") {
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
              {["Route", "Check", "Result", "Severity", "Details"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {results.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-900/30">
                <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-zinc-300">{r.route ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-gray-600 dark:text-zinc-400">{r.check_type ?? "—"}</td>
                <td className="px-3 py-2"><StatusBadge status={r.result ?? r.status} /></td>
                <td className="px-3 py-2"><SeverityBadge severity={r.severity ?? "info"} /></td>
                <td className="px-3 py-2 text-xs text-gray-600 dark:text-zinc-400 max-w-xs truncate">{r.details ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === "performance") {
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
              {["Route", "Avg", "Min", "Max", "Success Rate"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {results.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-900/30">
                <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-zinc-300">{r.route ?? "—"}</td>
                <td className="px-3 py-2 text-xs"><TimeBadge ms={r.avg_response ?? 0} /></td>
                <td className="px-3 py-2 text-xs"><TimeBadge ms={r.min_response ?? 0} /></td>
                <td className="px-3 py-2 text-xs"><TimeBadge ms={r.max_response ?? 0} /></td>
                <td className="px-3 py-2 text-xs font-medium">
                  {r.success_rate != null ? `${(r.success_rate * 100).toFixed(0)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // vibetest
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
            {["Agent", "Category", "Status", "Finding", "URL"].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
          {results.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-900/30">
              <td className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-zinc-300">{r.agent ?? "—"}</td>
              <td className="px-3 py-2 text-xs text-gray-600 dark:text-zinc-400">{r.category ?? "—"}</td>
              <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
              <td className="px-3 py-2 text-xs text-gray-600 dark:text-zinc-400 max-w-xs truncate">{r.finding ?? "—"}</td>
              <td className="px-3 py-2 text-xs text-blue-500 max-w-xs truncate">
                {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{r.url}</a> : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── tiny helpers ──────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === "pass" || s === "skip"
      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
      : s === "error" || s === "warn"
      ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20"
      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
  const Ic = s === "pass" || s === "skip" ? CheckCircle2 : s === "error" || s === "warn" ? AlertTriangle : XCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>
      <Ic className="w-3 h-3" />
      {status}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = severity.toLowerCase();
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400",
    high:     "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400",
    medium:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400",
    low:      "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400",
    info:     "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${colors[s] ?? colors.info}`}>
      {severity}
    </span>
  );
}

function TimeBadge({ ms }: { ms: number }) {
  const cls = ms > 1000 ? "text-red-500" : ms > 500 ? "text-yellow-500" : "text-green-500";
  return <span className={cls}>{ms}ms</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Page() {
  /* ── state ── */
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedSandbox, setSelectedSandbox] = useState("");
  const [layerStates, setLayerStates] = useState<Record<LayerId, LayerState>>(initAllLayers);
  const [running, setRunning] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [activeResultLayer, setActiveResultLayer] = useState<LayerId | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // per-layer logs & timeline selection
  const [layerLogs, setLayerLogs] = useState<Record<string, LogLine[]>>({});
  const logCursorsRef = useRef<Record<string, number>>({});
  const [selectedLayer, setSelectedLayer] = useState<LayerId | null>(null);

  // AI report
  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // timing
  const [layerStartTimes, setLayerStartTimes] = useState<Record<string, number>>({});
  const abortRef = useRef(false);

  const selectedDeployment = deployments.find((d) => d.sandboxId === selectedSandbox);

  /* ── load deployments ── */
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

  /* ── history ── */
  const fetchHistory = useCallback(async () => {
    if (!selectedSandbox) return;
    try {
      const res = await fetch(`/api/tests/run?sandboxId=${selectedSandbox}`);
      const d = await res.json();
      if (d.ok) setRuns(d.runs ?? []);
    } catch { /* ignore */ }
  }, [selectedSandbox]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchHistory(); }, [fetchHistory]);

  /* ── layer state helper ── */
  const setLayer = useCallback(
    (id: LayerId, patch: Partial<LayerState>) =>
      setLayerStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } })),
    [],
  );

  /* ── live log polling (per layer) ── */
  const pollLogs = useCallback(async (runId: string, layerId: LayerId) => {
    try {
      const cursor = logCursorsRef.current[layerId] ?? 0;
      const res = await fetch(`/api/tests/logs?runId=${runId}&after=${cursor}`);
      const d = await res.json();
      if (d.ok && d.logs?.length > 0) {
        const newLogs = d.logs as LogLine[];
        setLayerLogs((prev) => ({ ...prev, [layerId]: [...(prev[layerId] ?? []), ...newLogs] }));
        logCursorsRef.current[layerId] = Math.max(...newLogs.map((l: LogLine) => l.id));
      }
    } catch { /* best-effort */ }
  }, []);

  /* ── poll a single run until complete ── */
  const pollRun = useCallback(
    async (runId: string, layerId: LayerId): Promise<boolean> => {
      for (let attempt = 0; attempt < 90; attempt++) {
        if (abortRef.current) return false;
        await new Promise((r) => setTimeout(r, 3000));
        await pollLogs(runId, layerId);
        try {
          const res = await fetch(`/api/tests/run?sandboxId=${selectedSandbox}&type=${layerId}`);
          const d = await res.json();
          const run: TestRun | undefined = (d.runs ?? []).find((r: TestRun) => r.id === runId);
          if (!run) continue;
          if (run.status === "completed" || run.status === "failed") {
            await pollLogs(runId, layerId); // drain remaining logs
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
      setLayer(layerId, { phase: "failed", summary: "Timed out waiting for results" });
      return false;
    },
    [selectedSandbox, setLayer, pollLogs],
  );

  /* ── run a single layer ── */
  const runLayer = useCallback(
    async (layerId: LayerId): Promise<boolean> => {
      if (abortRef.current) return false;
      setLayer(layerId, { phase: "running", runId: null, results: [], summary: null, elapsed: 0 });
      setLayerStartTimes((p) => ({ ...p, [layerId]: Date.now() }));
      setSelectedLayer(layerId);
      try {
        const res = await fetch("/api/tests/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sandboxId: selectedSandbox, type: layerId }),
        });
        const d = await res.json();
        if (!d.ok) {
          setLayer(layerId, { phase: "failed", summary: d.error ?? "Failed to start" });
          return false;
        }
        setLayer(layerId, { runId: d.runId });
        return await pollRun(d.runId, layerId);
      } catch (err) {
        setLayer(layerId, { phase: "failed", summary: String(err) });
        return false;
      }
    },
    [selectedSandbox, setLayer, pollRun],
  );

  /* ── run ALL 5 layers sequentially ── */
  const handleRunAll = useCallback(async () => {
    if (!selectedSandbox) { setDeployError("Select a deployment first."); return; }
    if (selectedDeployment?.status !== "live") { setDeployError("Deployment must be live to run tests."); return; }

    setDeployError(null);
    setAllDone(false);
    setReport(null);
    setActiveResultLayer(null);
    setLayerLogs({});
    logCursorsRef.current = {};
    setSelectedLayer(null);
    abortRef.current = false;
    setRunning(true);
    setLayerStates(initAllLayers());

    for (const layer of LAYERS) {
      if (abortRef.current) break;
      await runLayer(layer.id);
    }

    setRunning(false);
    setAllDone(true);
    fetchHistory();
  }, [selectedSandbox, selectedDeployment, runLayer, fetchHistory]);

  const handleStop = () => {
    abortRef.current = true;
    setRunning(false);
  };

  /* ── AI report generation ── */
  const handleGenerateReport = async () => {
    const runIds: Record<string, string> = {};
    for (const l of LAYERS) {
      const s = layerStates[l.id];
      if (s.runId) runIds[l.id] = s.runId;
    }
    if (Object.keys(runIds).length === 0) return;

    setReportLoading(true);
    setReport(null);
    try {
      const res = await fetch("/api/tests/ai-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runIds }),
      });
      const d = await res.json();
      if (d.ok) setReport(d.report);
      else setReport(`Error: ${d.error ?? "Unknown error"}`);
    } catch (err) {
      setReport(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setReportLoading(false);
  };

  const handleCopyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-report-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── computed ── */
  const allResults = LAYERS.flatMap((l) => layerStates[l.id].results);
  const totalPassed = allResults.filter((r) => r.status === "pass" || r.result === "pass").length;
  const totalFailed = allResults.length - totalPassed;
  const totalTests = allResults.length;
  const overallScore = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : null;
  const completedLayers = LAYERS.filter((l) => layerStates[l.id].phase === "completed").length;
  const failedLayers = LAYERS.filter((l) => layerStates[l.id].phase === "failed").length;
  const currentLayer = LAYERS.find((l) => layerStates[l.id].phase === "running");

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── header ───────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800">
              <TestTube2 className="w-5 h-5 text-gray-700 dark:text-zinc-300" />
            </div>
            Security Test Suite
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            5-layer analysis — Route Health · API · Security · Performance · Vibetest
          </p>
        </div>
        <div className="flex items-center gap-2">
          {running && currentLayer && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running {currentLayer.label}…
            </span>
          )}
          <button
            onClick={() => { setShowHistory((p) => !p); fetchHistory(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Activity className="w-3.5 h-3.5" /> History
          </button>
        </div>
      </div>

      {/* ── deployment selector ───────────────────────────────────────── */}
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
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-xl transition-colors shadow-lg shadow-gray-900/15 dark:shadow-white/10 active:scale-[0.97]"
                >
                  <Play className="w-4 h-4" /> Run All 5 Tests
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors active:scale-[0.97]"
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
                  className="flex items-center gap-1 text-gray-600 dark:text-zinc-400 hover:underline font-mono truncate max-w-xs">
                  {selectedDeployment.publicUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
          </div>
        )}
        {deployError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{deployError}</p>}
      </div>

      {/* ── overall score ─────────────────────────────────────────────── */}
      {allDone && overallScore !== null && (
        <div className="mb-6 p-5 rounded-2xl border bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 border-indigo-200 dark:border-indigo-500/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Overall Health Score</p>
              <div className="flex items-end gap-2">
                <span className={`text-5xl font-black ${
                  overallScore >= 80 ? "text-green-600 dark:text-green-400" :
                  overallScore >= 50 ? "text-yellow-600 dark:text-yellow-400" :
                  "text-red-600 dark:text-red-400"
                }`}>{overallScore}</span>
                <span className="text-xl text-gray-400 mb-1">/100</span>
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
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleGenerateReport}
              disabled={reportLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 active:scale-[0.97]"
            >
              {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {reportLoading ? "Generating AI Report…" : "Generate AI Security Report"}
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

      {/* ── horizontal pipeline timeline ─────────────────────────────── */}
      <div className="mb-4 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-x-auto">
        <div className="flex items-start min-w-[540px]">
          {LAYERS.map((layer, i) => {
            const isLast = i === LAYERS.length - 1;
            const st = layerStates[layer.id];
            const isActive = st.phase === "running";
            const isCompleted = st.phase === "completed";
            const isFailed = st.phase === "failed";
            const passed = st.results.filter((r) => r.status === "pass" || r.result === "pass").length;
            const total = st.results.length;
            const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
            const { Icon } = layer;
            const isSelected = selectedLayer === layer.id;
            return (
              <React.Fragment key={layer.id}>
                {/* Step node */}
                <button
                  onClick={() => setSelectedLayer(layer.id)}
                  className="flex flex-col items-center gap-2.5 group flex-1 min-w-0 focus:outline-none"
                >
                  {/* Circle icon */}
                  <div className="relative">
                    <div className={[
                      "w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                      st.phase === "idle" ? "border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" : "",
                      isActive ? `border-transparent ${layer.bg} shadow-lg ring-4 ${layer.ring}` : "",
                      isCompleted ? "border-green-500 bg-green-500 shadow-lg shadow-green-500/30" : "",
                      isFailed ? "border-red-500 bg-red-500 shadow-lg shadow-red-500/30" : "",
                      isSelected && !isActive ? "ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-zinc-900" : "",
                    ].filter(Boolean).join(" ")}>
                      {isCompleted && <Check className="w-6 h-6 text-white" />}
                      {isFailed && <XCircle className="w-6 h-6 text-white" />}
                      {isActive && <Loader2 className={`w-6 h-6 animate-spin ${layer.text}`} />}
                      {st.phase === "idle" && <Icon className="w-6 h-6 text-gray-300 dark:text-zinc-600" />}
                    </div>
                    {/* Pulse ring while active */}
                    {isActive && (
                      <div className={`absolute inset-0 rounded-full ${layer.bar} opacity-20 animate-ping`} />
                    )}
                    {/* Step number badge */}
                    <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-[9px] font-bold text-gray-400 dark:text-zinc-600 flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  {/* Label + status */}
                  <div className="text-center px-1">
                    <p className={`text-xs font-semibold leading-tight ${
                      isActive ? layer.text :
                      isCompleted ? "text-green-500 dark:text-green-400" :
                      isFailed ? "text-red-500" :
                      isSelected ? "text-gray-800 dark:text-zinc-100" :
                      "text-gray-400 dark:text-zinc-600"
                    }`}>{layer.label}</p>
                    <p className="text-[10px] mt-0.5 h-4">
                      {st.phase === "idle" && <span className="text-gray-300 dark:text-zinc-700">Queued</span>}
                      {isActive && <span className="text-yellow-500 animate-pulse">Running…</span>}
                      {isCompleted && <span className="text-green-500">{total > 0 ? `${pct}% · ${total}` : "Done"}</span>}
                      {isFailed && <span className="text-red-400">Failed</span>}
                    </p>
                  </div>
                </button>
                {/* Animated connector line */}
                {!isLast && (
                  <div className="flex items-center mt-7 w-8 sm:w-12 shrink-0 px-1">
                    <div className="relative h-0.5 w-full bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out ${
                        isCompleted ? "w-full bg-green-500" :
                        isFailed ? "w-full bg-red-500" :
                        isActive ? `w-1/2 ${layer.bar}` : "w-0"
                      }`} />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        {/* Click hint */}
        {!running && !allDone && (
          <p className="mt-4 text-center text-[11px] text-gray-300 dark:text-zinc-700">
            Click any step to preview its logs
          </p>
        )}
      </div>

      {/* ── per-step detail panel ─────────────────────────────────────── */}
      {selectedLayer && (
        <div key={selectedLayer} className="mb-6 animate-in fade-in slide-in-from-top-1 duration-200">
          <StepDetailPanel
            layer={LAYERS.find((l) => l.id === selectedLayer)!}
            state={layerStates[selectedLayer]}
            logs={layerLogs[selectedLayer] ?? []}
            startTime={layerStartTimes[selectedLayer] ?? 0}
          />
        </div>
      )}

      {/* ── AI security report ────────────────────────────────────────── */}
      {report && (
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gray-600 dark:text-zinc-400" />
              <h3 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm">AI Security Report</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300">Groq · Llama 3.3 70B</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Download className="w-3 h-3" /> .md
              </button>
            </div>
          </div>
          <div className="p-5 prose prose-sm dark:prose-invert max-w-none">
            <MarkdownRenderer content={report} />
          </div>
        </div>
      )}

      {/* ── collapsible per-layer detailed results ────────────────────── */}
      {allDone && (
        <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Detailed Results
          </h2>
          {LAYERS.map((layer) => {
            const s = layerStates[layer.id];
            if (s.results.length === 0) return null;
            const { Icon } = layer;
            const passed = s.results.filter((r) => r.status === "pass" || r.result === "pass").length;
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
                    <ResultsTable results={s.results} type={layer.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── run history ───────────────────────────────────────────────── */}
      {showHistory && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4" /> Run History
              {runs.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded-full">{runs.length}</span>
              )}
            </h2>
            <button onClick={fetchHistory} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {runs.length === 0 && (
              <p className="text-center py-8 text-gray-400 dark:text-zinc-600 text-sm">No previous runs found.</p>
            )}
            {runs.map((run) => (
              <div key={run.id} className="p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {run.status === "running" ? <Loader2 className="w-4 h-4 text-yellow-500 animate-spin shrink-0" />
                    : run.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {run.type} — {new Date(run.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5 line-clamp-1">
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

/* ═══════════════════════════════════════════════════════════════════════════
   MARKDOWN RENDERER (minimal, no dependencies)
   ═══════════════════════════════════════════════════════════════════════════ */

function MarkdownRenderer({ content }: { content: string }) {
  const html = markdownToHtml(content);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function markdownToHtml(md: string): string {
  let html = md;

  // code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
    const escaped = escapeHtml(code.trim());
    return `<pre class="bg-gray-950 text-gray-200 rounded-lg p-4 overflow-x-auto text-xs"><code class="language-${lang ?? ""}">${escaped}</code></pre>`;
  });

  // inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

  // headings
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-sm font-semibold text-gray-800 dark:text-zinc-200 mt-4 mb-2">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-800 dark:text-zinc-200 mt-5 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-3 pb-2 border-b border-gray-200 dark:border-zinc-800">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-gray-900 dark:text-white mt-4 mb-4">$1</h1>');

  // bold / italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-gray-700 dark:text-zinc-300">$1</li>');
  // ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal text-sm text-gray-700 dark:text-zinc-300">$1</li>');

  // paragraphs (lines that aren't tags)
  html = html.replace(/^(?!<[hluop]|<li|<pre|<code|<div|<strong)(.+)$/gm, (_, p) => {
    const trimmed = p.trim();
    if (!trimmed) return "";
    return `<p class="text-sm text-gray-700 dark:text-zinc-300 mb-2 leading-relaxed">${trimmed}</p>`;
  });

  // collapse consecutive <li> into <ul>
  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, (match) => {
    if (match.includes("list-decimal")) return `<ol class="mb-3 space-y-1">${match}</ol>`;
    return `<ul class="mb-3 space-y-1">${match}</ul>`;
  });

  return html;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
