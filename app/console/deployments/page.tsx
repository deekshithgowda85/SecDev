"use client";
import { useState } from "react";
import { getDeployments } from "@/lib/mock-api";
import type { DeploymentStatus } from "@/lib/mock-api";
import {
  CheckCircle2, XCircle, Clock, RefreshCw, ExternalLink,
  GitBranch, GitCommit, RotateCcw, Rocket, Filter,
} from "lucide-react";

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusBadge({ status }: { status: DeploymentStatus }) {
  const cfg: Record<DeploymentStatus, { cls: string; icon: React.ReactNode; label: string }> = {
    success:   { cls: "bg-green-50  text-green-700  border-green-200  dark:bg-green-500/10  dark:text-green-400  dark:border-green-500/20",  icon: <CheckCircle2 className="w-3 h-3" />, label: "Success" },
    building:  { cls: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20", icon: <RefreshCw  className="w-3 h-3 animate-spin" />, label: "Building" },
    failed:    { cls: "bg-red-50    text-red-700    border-red-200    dark:bg-red-500/10    dark:text-red-400    dark:border-red-500/20",    icon: <XCircle    className="w-3 h-3" />, label: "Failed" },
    queued:    { cls: "bg-gray-100  text-gray-600   border-gray-200   dark:bg-zinc-800     dark:text-zinc-400   dark:border-zinc-700",       icon: <Clock      className="w-3 h-3" />, label: "Queued" },
    cancelled: { cls: "bg-gray-100  text-gray-500   border-gray-200   dark:bg-zinc-800     dark:text-zinc-500   dark:border-zinc-700",       icon: <XCircle    className="w-3 h-3" />, label: "Cancelled" },
  };
  const { cls, icon, label } = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {icon}{label}
    </span>
  );
}

const ALL_STATUSES: (DeploymentStatus | "all")[] = ["all", "success", "building", "failed", "queued"];

export default function DeploymentsPage() {
  const all = getDeployments();
  const [filter, setFilter] = useState<DeploymentStatus | "all">("all");
  const [showLogs, setShowLogs] = useState<string | null>(null);

  const filtered = filter === "all" ? all : all.filter((d) => d.status === filter);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deployments</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">{all.length} total deployments across all projects</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Rocket className="w-4 h-4" /> Deploy Now
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg w-fit">
        <Filter className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 ml-1" />
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
              filter === s
                ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Project</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide hidden md:table-cell">Commit</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide hidden lg:table-cell">Duration</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">When</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {filtered.map((dep) => (
                <>
                  <tr key={dep.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-5 py-4"><StatusBadge status={dep.status} /></td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{dep.project}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />{dep.branch}
                      </p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-xs font-mono text-gray-500 dark:text-zinc-400">{dep.commit}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 truncate max-w-[200px]">{dep.commitMessage}</p>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-xs text-gray-500 dark:text-zinc-400">{dep.duration}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-gray-500 dark:text-zinc-400">{timeAgo(dep.createdAt)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setShowLogs(showLogs === dep.id ? null : dep.id)}
                          className="text-xs text-gray-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
                        >
                          Logs
                        </button>
                        <button className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
                          <RotateCcw className="w-3 h-3" />Redeploy
                        </button>
                        {dep.url !== "—" && (
                          <a href={dep.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 dark:text-zinc-600 hover:text-indigo-500 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                  {showLogs === dep.id && (
                    <tr key={`${dep.id}-logs`}>
                      <td colSpan={6} className="px-5 py-4 bg-gray-950 dark:bg-black border-t border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-zinc-500 mb-2 font-mono">Build logs — {dep.id}</p>
                        <div className="font-mono text-xs text-green-400 space-y-1">
                          <p>▶ Cloning {dep.branch}@{dep.commit}...</p>
                          <p>▶ npm ci — installing dependencies</p>
                          <p>▶ next build — compiling 47 modules</p>
                          {dep.status === "success" && <p className="text-green-400">✓ Build completed in {dep.duration}</p>}
                          {dep.status === "failed" && <p className="text-red-400">✗ Build failed — see error above</p>}
                          {dep.status === "building" && <p className="text-yellow-400 animate-pulse">● Building in progress…</p>}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400 dark:text-zinc-500">
                    No deployments match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
