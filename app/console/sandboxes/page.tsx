"use client";
import { useState } from "react";
import { getSandboxes } from "@/lib/mock-api";
import type { SandboxStatus } from "@/lib/mock-api";
import { Box, Trash2, RefreshCw, Plus, Cpu, HardDrive, Globe } from "lucide-react";

const STATUS_CFG: Record<SandboxStatus, { cls: string; dot: string; label: string }> = {
  running: { cls: "bg-green-50  text-green-700  border-green-200  dark:bg-green-500/10  dark:text-green-400  dark:border-green-500/20", dot: "bg-green-500 animate-pulse", label: "Running" },
  stopped: { cls: "bg-gray-100  text-gray-600   border-gray-200   dark:bg-zinc-800     dark:text-zinc-400   dark:border-zinc-700",      dot: "bg-gray-400 dark:bg-zinc-600",                label: "Stopped" },
  error:   { cls: "bg-red-50    text-red-700    border-red-200    dark:bg-red-500/10    dark:text-red-400    dark:border-red-500/20",    dot: "bg-red-500",                               label: "Error" },
};

function StatusBadge({ status }: { status: SandboxStatus }) {
  const { cls, dot, label } = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{label}
    </span>
  );
}

function CpuBar({ value }: { value: number }) {
  const color = value > 80 ? "bg-red-500" : value > 50 ? "bg-yellow-500" : "bg-indigo-500";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 dark:text-zinc-500">CPU</span>
        <span className="text-xs font-mono text-gray-700 dark:text-zinc-300">{value}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function MemBar({ value }: { value: number }) {
  const max = 1024;
  const pct = (value / max) * 100;
  const color = pct > 80 ? "bg-red-500" : pct > 50 ? "bg-yellow-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 dark:text-zinc-500">Memory</span>
        <span className="text-xs font-mono text-gray-700 dark:text-zinc-300">{value}MB</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SandboxesPage() {
  const initial = getSandboxes();
  const [sandboxes, setSandboxes] = useState(initial);

  const destroy = (id: string) => setSandboxes((prev) => prev.filter((s) => s.id !== id));
  const running = sandboxes.filter((s) => s.status === "running").length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sandbox Manager</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">
            {running} running · {sandboxes.length} total · Powered by E2B
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Sandbox
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Box className="w-4 h-4 text-indigo-500" />
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Running</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{running}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Total CPU</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {sandboxes.reduce((s, b) => s + b.cpu, 0)}%
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <HardDrive className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Total Memory</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {sandboxes.reduce((s, b) => s + b.memory, 0)}MB
          </p>
        </div>
      </div>

      {/* Sandbox cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {sandboxes.map((sb) => (
          <div key={sb.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-xs font-mono text-gray-500 dark:text-zinc-500">{sb.id}</code>
                  <StatusBadge status={sb.status} />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{sb.project}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-zinc-500">
                  <Globe className="w-3 h-3" />
                  <span>{sb.region}</span>
                  {sb.uptime !== "—" && <><span>·</span><span>Uptime: {sb.uptime}</span></>}
                </div>
              </div>
              <div className="flex gap-1">
                {sb.status === "running" && (
                  <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => destroy(sb.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <CpuBar value={sb.cpu} />
              <MemBar value={sb.memory} />
            </div>
          </div>
        ))}

        {sandboxes.length === 0 && (
          <div className="col-span-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-12 text-center">
            <Box className="w-10 h-10 mx-auto text-gray-300 dark:text-zinc-700 mb-3" />
            <p className="text-sm text-gray-500 dark:text-zinc-500">No sandboxes running. Click &quot;New Sandbox&quot; to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
