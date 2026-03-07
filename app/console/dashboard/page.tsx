"use client";

import { useEffect, useState } from "react";
import {
  Rocket, Box, TestTube2, Shield, Plus, ArrowRight,
  CheckCircle2, XCircle, Loader2, RefreshCw, ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { RepositoryList } from "@/components/console/repository-list";

interface Stats {
  deployments: { total: number; live: number };
  runs: {
    total: number;
    completed: number;
    failed: number;
    byType: Record<string, { total: number; completed: number; failed: number }>;
  };
  securityAgent: { total: number; completed: number };
  recent: Array<{
    id: string;
    sandboxId: string;
    type: string;
    status: string;
    createdAt: number;
    finishedAt: number | null;
    summary: string | null;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  suite: "Test Suite",
  security: "Security",
  api: "API Tests",
  performance: "Performance",
  vibetest: "Vibetest",
};

const TYPE_HREFS: Record<string, string> = {
  suite: "/console/testing",
  security: "/console/security",
  api: "/console/api-testing",
  performance: "/console/performance",
  vibetest: "/console/vibetest",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      if (data.ok) setStats(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const passRate = stats && stats.runs.total > 0
    ? Math.round((stats.runs.completed / stats.runs.total) * 100)
    : null;

  // Best security score from byType — doesn't exist directly, use runs.completed as proxy
  const totalRuns = stats?.runs.total ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">
            Overview of your SecDev platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center justify-center w-8 h-8 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/console/deployments"
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> New Deployment
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deployments */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Deployments</p>
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-gray-700 dark:text-zinc-300" />
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-300 dark:text-zinc-600" />
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.deployments.total ?? 0}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">{stats?.deployments.live ?? 0} live</p>
            </>
          )}
        </div>

        {/* Active Sandboxes */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Active Sandboxes</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-600/20 flex items-center justify-center">
              <Box className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-300 dark:text-zinc-600" />
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.deployments.live ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">running now</p>
            </>
          )}
        </div>

        {/* Test Runs */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Test Runs</p>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-600/20 flex items-center justify-center">
              <TestTube2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-300 dark:text-zinc-600" />
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalRuns}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                {passRate !== null ? `${passRate}% pass rate` : "no runs yet"}
              </p>
            </>
          )}
        </div>

        {/* Security Agent */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Security Scans</p>
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-600/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-300 dark:text-zinc-600" />
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(stats?.runs.byType?.["security"]?.total ?? 0) + (stats?.securityAgent.total ?? 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                {stats?.securityAgent.completed ?? 0} AI agent scans
              </p>
            </>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Connect GitHub", href: "/console/github", desc: "Link your repositories" },
          { label: "Add Env Vars", href: "/console/env", desc: "Manage secrets" },
          { label: "Run Tests", href: "/console/testing", desc: "View test results" },
          { label: "Security Agent", href: "/console/security-agent", desc: "AI security scans" },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:border-gray-400 dark:hover:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all group"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{a.label}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{a.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 dark:text-zinc-600 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
          </Link>
        ))}
      </div>

      {/* Test runs by type */}
      {stats && Object.keys(stats.runs.byType).length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Tests by Type</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Cumulative run counts across all deployments</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {Object.entries(stats.runs.byType).map(([type, counts]) => {
              const pct = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
              return (
                <Link
                  key={type}
                  href={TYPE_HREFS[type] ?? "/console/testing"}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white w-28">{TYPE_LABELS[type] ?? type}</p>
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 w-20 text-right">{counts.completed}/{counts.total} passed</p>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-zinc-600" />
                </Link>
              );
            })}
            {stats.securityAgent.total > 0 && (
              <Link
                href="/console/security-agent"
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white w-28 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" /> AI Agent
                </p>
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.round((stats.securityAgent.completed / stats.securityAgent.total) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 w-20 text-right">
                  {stats.securityAgent.completed}/{stats.securityAgent.total} done
                </p>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-zinc-600" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {stats && stats.recent.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Latest test runs across all deployments</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {stats.recent.map((run) => (
              <Link
                key={run.id}
                href={TYPE_HREFS[run.type] ?? "/console/testing"}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {run.status === "running" ? (
                  <Loader2 className="w-4 h-4 text-yellow-500 animate-spin shrink-0" />
                ) : run.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {TYPE_LABELS[run.type] ?? run.type} — {new Date(run.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                    {run.summary ?? (run.status === "running" ? "Running…" : "No summary")}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium border ${
                  run.status === "running"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20"
                    : run.status === "completed"
                      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                }`}>
                  {run.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Repositories — top 6, live from GitHub */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Repositories</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Live from GitHub — top 6 by last push</p>
          </div>
          <Link href="/console/github" className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors underline underline-offset-2">
            View all →
          </Link>
        </div>
        <div className="p-5">
          <RepositoryList limit={6} showViewToggle={false} defaultView="table" compact />
        </div>
      </div>
    </div>
  );
}

