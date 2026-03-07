"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Box,
  RefreshCw,
  Trash2,
  ExternalLink,
  ScrollText,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
  Cpu,
  AlertTriangle,
} from "lucide-react";

interface SandboxInfo {
  sandboxId: string;
  templateId: string;
  templateName: string;
  repoName: string | null;
  repoUrl: string | null;
  branch: string | null;
  status: "deploying" | "live" | "failed" | "running";
  publicUrl: string | null;
  logsUrl: string | null;
  startedAt: string;
  logCount: number;
  runningForMs: number;
  metadata: Record<string, string>;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  deploying: <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />,
  live: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  running: <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />,
};

const STATUS_LABEL: Record<string, string> = {
  deploying: "Deploying",
  live: "Live",
  failed: "Failed",
  running: "Running",
};

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// Frameworks that work well inside a 1 GB / 2 vCPU sandbox
const RECOMMENDED_FRAMEWORKS = [
  { name: "Express / Fastify", mem: "~50 MB", note: "Best fit — instant start, minimal RAM" },
  { name: "Vite (React / Vue / Svelte)", mem: "~400 MB build", note: "Fast build, light runtime" },
  { name: "Static HTML + serve", mem: "~10 MB", note: "Zero build step, near-instant" },
  { name: "SvelteKit", mem: "~200 MB build", note: "Much lighter than Next.js" },
  { name: "Next.js (dev mode)", mem: "~450 MB", note: "⚑ We run `next dev` to avoid OOM" },
  { name: "Astro (static)", mem: "~200 MB build", note: "Ideal for content sites" },
];

const AVOID_FRAMEWORKS = [
  { name: "Next.js prod build (`next build`)", reason: "Needs 1.5-2 GB RAM — sandbox OOM" },
  { name: "Remix prod build", reason: "Similar memory footprint to Next.js" },
  { name: "Angular CLI build", reason: "Webpack is slow and memory-heavy" },
];

export default function Page() {
  const [sandboxes, setSandboxes] = useState<SandboxInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [killing, setKilling] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const fetchSandboxes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sandboxes");
      const data = await res.json();
      if (data.ok) {
        setSandboxes(data.sandboxes ?? []);
      } else {
        setError(data.error ?? "Failed to load sandboxes");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSandboxes();
    const interval = setInterval(fetchSandboxes, 10_000);
    return () => clearInterval(interval);
  }, [fetchSandboxes]);

  const handleKill = async (sandboxId: string) => {
    setKilling(sandboxId);
    try {
      await fetch("/api/sandboxes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId }),
      });
      setSandboxes((prev) => prev.filter((s) => s.sandboxId !== sandboxId));
    } finally {
      setKilling(null);
    }
  };

  const hasDeploying = sandboxes.some((s) => s.status === "deploying");

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sandbox Manager</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            All active E2B sandboxes — live from the API, auto-refreshes every 10s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {showGuide ? "Hide" : "Framework"} guide
          </button>
          <button
            onClick={fetchSandboxes}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Framework guide panel */}
      {showGuide && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4">
            <p className="text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wider mb-3">
              ✅ Works great (1 GB sandbox)
            </p>
            <div className="space-y-2">
              {RECOMMENDED_FRAMEWORKS.map((fw) => (
                <div key={fw.name} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-green-900 dark:text-green-200">{fw.name}</p>
                    <p className="text-xs text-green-700 dark:text-green-400">{fw.note}</p>
                  </div>
                  <span className="text-xs font-mono text-green-600 dark:text-green-400 shrink-0">{fw.mem}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
            <p className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider mb-3">
              ⚠️ Avoid (causes OOM / timeout)
            </p>
            <div className="space-y-2">
              {AVOID_FRAMEWORKS.map((fw) => (
                <div key={fw.name}>
                  <p className="text-xs font-semibold text-red-900 dark:text-red-200">{fw.name}</p>
                  <p className="text-xs text-red-700 dark:text-red-400">{fw.reason}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-500/20">
              <p className="text-xs text-red-700 dark:text-red-400">
                <strong>Fix already applied:</strong> Next.js deploys now run{" "}
                <code className="bg-red-100 dark:bg-red-500/20 px-1 rounded">next dev</code> instead of{" "}
                <code className="bg-red-100 dark:bg-red-500/20 px-1 rounded">next build</code> — saving ~1 GB RAM and 3-5 min build time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {sandboxes.length > 0 && (
        <div className="flex items-center gap-4 mb-4 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs text-gray-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5" />
            <strong className="text-gray-900 dark:text-white">{sandboxes.length}</strong> active
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            {sandboxes.filter((s) => s.status === "live").length} live
          </span>
          {hasDeploying && (
            <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {sandboxes.filter((s) => s.status === "deploying").length} deploying
            </span>
          )}
          <span className="flex items-center gap-1.5 ml-auto text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Each sandbox: 2 vCPU · 1 GB RAM · 1 hr timeout
          </span>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && sandboxes.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
          <Box className="w-10 h-10 text-gray-300 dark:text-zinc-600 mb-3" />
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No active sandboxes</p>
          <p className="text-xs text-gray-500 dark:text-zinc-500">
            Deploy a repository to spin up a sandbox.
          </p>
        </div>
      )}

      {sandboxes.length > 0 && (
        <div className="space-y-3">
          {sandboxes.map((sb) => (
            <div
              key={sb.sandboxId}
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 hover:border-gray-400 dark:hover:border-zinc-600 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {sb.repoName ?? sb.sandboxId}
                    </h3>
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-medium shrink-0">
                      {STATUS_ICON[sb.status]}
                      {STATUS_LABEL[sb.status]}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 font-mono shrink-0">
                      {sb.templateName}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-zinc-400">
                    {sb.branch && <span>branch: {sb.branch}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(sb.runningForMs)} running
                    </span>
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      2 vCPU · 1 GB
                    </span>
                    <span className="font-mono text-gray-400 dark:text-zinc-600 truncate max-w-[200px]">
                      {sb.sandboxId}
                    </span>
                    {sb.logCount > 0 && <span>{sb.logCount} log lines</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {sb.logsUrl && (
                    <Link
                      href={sb.logsUrl}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <ScrollText className="w-3 h-3" />
                      Logs
                    </Link>
                  )}
                  {sb.status === "live" && sb.publicUrl && (
                    <a
                      href={sb.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </a>
                  )}
                  <button
                    onClick={() => handleKill(sb.sandboxId)}
                    disabled={killing === sb.sandboxId}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    {killing === sb.sandboxId ? "Killing…" : "Kill"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

