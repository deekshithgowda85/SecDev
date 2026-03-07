import {
  Rocket, Box, TestTube2, Shield, Plus, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { RepositoryList } from "@/components/console/repository-list";

function StatCard({ title, icon, accentBg }: {
  title: string; icon: React.ReactNode; accentBg: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">{title}</p>
        <div className={`w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-400 dark:text-zinc-600">—</p>
      <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">Not implemented</p>
    </div>
  );
}

export default function DashboardPage() {
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
        <Link
          href="/console/deployments"
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Deployment
        </Link>
      </div>

      {/* Stats grid — not implemented */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Deployments"
          icon={<Rocket className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          accentBg="bg-indigo-100 dark:bg-indigo-600/20"
        />
        <StatCard
          title="Active Sandboxes"
          icon={<Box className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          accentBg="bg-emerald-100 dark:bg-emerald-600/20"
        />
        <StatCard
          title="Tests Passed"
          icon={<TestTube2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          accentBg="bg-blue-100 dark:bg-blue-600/20"
        />
        <StatCard
          title="Security Score"
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
