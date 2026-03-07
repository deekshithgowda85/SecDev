import { getDashboardStats, getDeployments } from "@/lib/mock-api";
import {
  Rocket, Box, TestTube2, Shield, CheckCircle2, XCircle,
  Clock, RefreshCw, ExternalLink, GitBranch, GitCommit, Plus, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { DeploymentStatus } from "@/lib/mock-api";

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

function StatCard({ title, value, sub, icon, accentBg }: {
  title: string; value: string | number; sub: string;
  icon: React.ReactNode; accentBg: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">{title}</p>
        <div className={`w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">{sub}</p>
    </div>
  );
}

export default function DashboardPage() {
  const stats = getDashboardStats();
  const deployments = getDeployments().slice(0, 5);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">
            Overview of your SecDev platform — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <Link
          href="/console/deployments"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Deployment
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Deployments"
          value={stats.totalDeployments}
          sub={`${stats.successfulDeployments} successful`}
          icon={<Rocket className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          accentBg="bg-indigo-100 dark:bg-indigo-600/20"
        />
        <StatCard
          title="Active Sandboxes"
          value={stats.activeSandboxes}
          sub={`of ${stats.totalSandboxes} total`}
          icon={<Box className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          accentBg="bg-emerald-100 dark:bg-emerald-600/20"
        />
        <StatCard
          title="Tests Passed"
          value={`${stats.testsPassed}/${stats.testsPassed + stats.testsFailed}`}
          sub={`${stats.testsFailed} failing`}
          icon={<TestTube2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          accentBg="bg-blue-100 dark:bg-blue-600/20"
        />
        <StatCard
          title="Security Score"
          value={`${stats.securityScore}/100`}
          sub={`${stats.criticalVulnerabilities} critical issue${stats.criticalVulnerabilities !== 1 ? "s" : ""}`}
          icon={<Shield className="w-4 h-4 text-orange-600 dark:text-orange-400" />}
          accentBg="bg-orange-100 dark:bg-orange-600/20"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Connect GitHub", href: "/console/github", desc: "Link your repositories" },
          { label: "Add Env Vars", href: "/console/env", desc: "Manage secrets" },
          { label: "Run Tests", href: "/console/testing", desc: "View test results" },
          { label: "View Logs", href: "/console/logs", desc: "Build & runtime logs" },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all group"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{a.label}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{a.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 dark:text-zinc-600 group-hover:text-indigo-500 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Recent deployments */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Deployments</h2>
          <Link href="/console/deployments" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {deployments.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <StatusBadge status={dep.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{dep.project}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-zinc-500">
                  <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{dep.branch}</span>
                  <span className="flex items-center gap-1"><GitCommit className="w-3 h-3" />{dep.commit}</span>
                  <span className="truncate max-w-[200px]">{dep.commitMessage}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400 dark:text-zinc-400">{timeAgo(dep.createdAt)}</p>
                <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">{dep.duration}</p>
              </div>
              {dep.url !== "—" && (
                <a href={dep.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-gray-400 dark:text-zinc-600 hover:text-indigo-500 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline overview */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Deployment Pipeline</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { step: "1", label: "Connect GitHub", done: true },
            { step: "→", label: "", done: true, arrow: true },
            { step: "2", label: "Create Project", done: true },
            { step: "→", label: "", done: true, arrow: true },
            { step: "3", label: "Deploy App", done: true },
            { step: "→", label: "", done: false, arrow: true },
            { step: "4", label: "Run Tests", done: false },
            { step: "→", label: "", done: false, arrow: true },
            { step: "5", label: "View Reports", done: false },
          ].map((s, i) =>
            s.arrow ? (
              <ArrowRight key={i} className="w-4 h-4 text-gray-300 dark:text-zinc-700" />
            ) : (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                  s.done
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-600/15 dark:border-indigo-600/30 dark:text-indigo-400"
                    : "bg-gray-50 border-gray-200 text-gray-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-500"
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                  s.done ? "bg-indigo-600 text-white" : "bg-gray-300 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400"
                }`}>{s.step}</span>
                {s.label}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
