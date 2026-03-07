"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollText, RefreshCw, CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";

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

const STATUS_ICON: Record<DeploymentSummary["status"], React.ReactNode> = {
  deploying: <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />,
  live: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-500" />,
};

const STATUS_LABEL: Record<DeploymentSummary["status"], string> = {
  deploying: "Deploying",
  live: "Live",
  failed: "Failed",
};

export default function Page() {
  const [deployments, setDeployments] = useState<DeploymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const interval = setInterval(fetchDeployments, 5_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logs</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            All deployment runs — click a row to view full logs
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

      {!loading && deployments.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
          <ScrollText className="w-10 h-10 text-gray-300 dark:text-zinc-600 mb-3" />
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No deployments yet</p>
          <p className="text-xs text-gray-500 dark:text-zinc-500">
            Deploy a repository to start seeing logs here.
          </p>
        </div>
      )}

      {deployments.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  Lines
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  Started
                </th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {deployments.map((d) => (
                <tr
                  key={d.sandboxId}
                  className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate max-w-[160px]">
                    {d.repoName}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-zinc-400 font-mono text-xs">
                    {d.branch}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-zinc-300">
                      {STATUS_ICON[d.status]}
                      {STATUS_LABEL[d.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-zinc-400 text-xs tabular-nums">
                    {d.logCount}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-zinc-400 text-xs tabular-nums">
                    {new Date(d.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/console/deployments/${d.sandboxId}`}
                      className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      View <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

