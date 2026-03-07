"use client";

import { useEffect, useState } from "react";
import { Rocket, ExternalLink, Trash2, RefreshCw, Server } from "lucide-react";

interface SandboxInfo {
  sandboxId: string;
  templateId: string;
  name?: string;
  metadata: Record<string, string>;
  startedAt: string;
}

export default function Page() {
  const [sandboxes, setSandboxes] = useState<SandboxInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [killingId, setKillingId] = useState<string | null>(null);

  const fetchSandboxes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deploy");
      const data = await res.json();
      if (data.ok) {
        setSandboxes(data.sandboxes ?? []);
      } else {
        setError(data.error ?? "Failed to load deployments");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSandboxes();
  }, []);

  const handleKill = async (sandboxId: string) => {
    setKillingId(sandboxId);
    try {
      const res = await fetch(`/api/deploy/${sandboxId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setSandboxes((prev) => prev.filter((s) => s.sandboxId !== sandboxId));
      }
    } catch {
      // ignore
    } finally {
      setKillingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deployments</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Live E2B sandbox deployments
          </p>
        </div>
        <button
          onClick={fetchSandboxes}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && sandboxes.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-48" />
                <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-20" />
              </div>
              <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded w-64 mt-3" />
            </div>
          ))}
        </div>
      )}

      {!loading && sandboxes.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
          <Server className="w-10 h-10 text-gray-300 dark:text-zinc-600 mb-3" />
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No active deployments</p>
          <p className="text-xs text-gray-500 dark:text-zinc-500">
            Deploy a repository from the Projects page to see it here.
          </p>
        </div>
      )}

      {sandboxes.length > 0 && (
        <div className="space-y-3">
          {sandboxes.map((sb) => {
            const repoUrl = sb.metadata?.repoUrl;
            const repoName = repoUrl?.split("/").pop()?.replace(".git", "") ?? sb.sandboxId;
            const branch = sb.metadata?.branch ?? "main";
            const createdAt = sb.metadata?.createdAt
              ? new Date(sb.metadata.createdAt).toLocaleString()
              : new Date(sb.startedAt).toLocaleString();

            return (
              <div
                key={sb.sandboxId}
                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 hover:border-gray-400 dark:hover:border-zinc-600 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Rocket className="w-4 h-4 text-gray-500 dark:text-zinc-400 shrink-0" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {repoName}
                      </h3>
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 font-medium shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Live
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-zinc-400 mt-1">
                      <span>Branch: {branch}</span>
                      <span>Template: {sb.templateId}</span>
                      <span>Started: {createdAt}</span>
                      <span className="font-mono text-gray-400 dark:text-zinc-500">{sb.sandboxId}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`https://${sb.sandboxId}-3000.e2b.dev`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </a>
                    <button
                      onClick={() => handleKill(sb.sandboxId)}
                      disabled={killingId === sb.sandboxId}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      {killingId === sb.sandboxId ? "Stopping…" : "Stop"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
