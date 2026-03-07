"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Rocket, ExternalLink, Trash2, RefreshCw, Server, ScrollText, RotateCcw, AlertTriangle } from "lucide-react";

interface DeploymentSummary {
  sandboxId: string;
  repoName: string;
  repoUrl: string;
  branch: string;
  publicUrl: string;
  status: "deploying" | "live" | "failed";
  startedAt: number;
  logCount: number;
}

// E2B free sandboxes auto-shutdown after 30 minutes
const E2B_TIMEOUT_MS = 30 * 60 * 1000;

const STATUS_BADGE: Record<DeploymentSummary["status"], string> = {
  deploying:
    "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20",
  live: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
  failed:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
};

const STATUS_DOT: Record<DeploymentSummary["status"], string> = {
  deploying: "bg-yellow-500 animate-pulse",
  live: "bg-green-500 animate-pulse",
  failed: "bg-red-500",
};

export default function Page() {
  const router = useRouter();
  const [deployments, setDeployments] = useState<DeploymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [killingId, setKillingId] = useState<string | null>(null);
  const [redeployingId, setRedeployingId] = useState<string | null>(null);

  const fetchDeployments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deploy");
      const data = await res.json();
      if (data.ok) {
        setDeployments(data.deployments ?? []);
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
    fetchDeployments();
    const interval = setInterval(() => {
      setDeployments((prev) => {
        if (prev.some((d) => d.status === "deploying")) fetchDeployments();
        return prev;
      });
    }, 5_000);
    return () => clearInterval(interval);
  }, []);

  const handleKill = async (sandboxId: string) => {
    setKillingId(sandboxId);
    try {
      const res = await fetch(`/api/deploy/${sandboxId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setDeployments((prev) => prev.filter((d) => d.sandboxId !== sandboxId));
      }
    } catch {
      // ignore
    } finally {
      setKillingId(null);
    }
  };

  const handleRedeploy = async (sandboxId: string) => {
    setRedeployingId(sandboxId);
    try {
      const res = await fetch(`/api/deploy/${sandboxId}`, { method: "POST" });
      const data = await res.json();
      if (data.ok && data.deployment?.sandboxId) {
        // Navigate to the new deployment's log page
        router.push(`/console/deployments/${data.deployment.sandboxId}`);
      } else {
        alert(data.error ?? "Redeploy failed");
      }
    } catch {
      alert("Network error — could not redeploy");
    } finally {
      setRedeployingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deployments</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            E2B sandbox deployments — click a row to view live logs
          </p>
        </div>
        <button
          onClick={fetchDeployments}
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

      {loading && deployments.length === 0 && (
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

      {!loading && deployments.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
          <Server className="w-10 h-10 text-gray-300 dark:text-zinc-600 mb-3" />
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No active deployments</p>
          <p className="text-xs text-gray-500 dark:text-zinc-500">
            Deploy a repository from the Projects page to see it here.
          </p>
        </div>
      )}

      {deployments.length > 0 && (
        <div className="space-y-3">
          {deployments.map((d) => (
            <div
              key={d.sandboxId}
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 hover:border-gray-400 dark:hover:border-zinc-600 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Rocket className="w-4 h-4 text-gray-500 dark:text-zinc-400 shrink-0" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {d.repoName}
                    </h3>
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${STATUS_BADGE[d.status]}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[d.status]}`} />
                      {d.status}
                    </span>
                    {/* Timed-out warning: live but older than 30 min */}
                    {d.status === "live" && Date.now() - d.startedAt > E2B_TIMEOUT_MS && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20">
                        <AlertTriangle className="w-3 h-3" /> may have timed out
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-zinc-400 mt-1">
                    <span>Branch: {d.branch}</span>
                    <span className="font-mono text-gray-400 dark:text-zinc-500">{d.sandboxId}</span>
                    <span>{new Date(d.startedAt).toLocaleString()}</span>
                    <span>{d.logCount} log lines</span>
                  </div>
                  {d.publicUrl && d.status !== "live" && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-xs text-gray-400 dark:text-zinc-500">Preview URL:</span>
                      <a
                        href={d.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 truncate max-w-xs"
                      >
                        {d.publicUrl}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/console/deployments/${d.sandboxId}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <ScrollText className="w-3 h-3" />
                    Logs
                  </Link>
                  {d.publicUrl && d.status === "live" && (
                    <a
                      href={d.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </a>
                  )}
                  {/* Redeploy for failed OR potentially timed-out live sandboxes */}
                  {(d.status === "failed" || (d.status === "live" && Date.now() - d.startedAt > E2B_TIMEOUT_MS)) && (
                    <button
                      onClick={() => handleRedeploy(d.sandboxId)}
                      disabled={redeployingId === d.sandboxId}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {redeployingId === d.sandboxId ? "Starting…" : "Redeploy"}
                    </button>
                  )}
                  <button
                    onClick={() => handleKill(d.sandboxId)}
                    disabled={killingId === d.sandboxId}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    {killingId === d.sandboxId ? "Stopping…" : "Stop"}
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
