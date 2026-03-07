"use client";
import { useState, useMemo } from "react";
import { getLogs, getDeployments } from "@/lib/mock-api";
import type { LogLevel, LogSource } from "@/lib/mock-api";
import { Search, Circle } from "lucide-react";

const LEVEL_CLS: Record<LogLevel, string> = {
  info:  "text-blue-600  dark:text-blue-400",
  warn:  "text-yellow-600 dark:text-yellow-400",
  error: "text-red-600   dark:text-red-400",
  debug: "text-gray-400  dark:text-zinc-500",
};

const LEVEL_DOT: Record<LogLevel, string> = {
  info:  "bg-blue-500",
  warn:  "bg-yellow-500",
  error: "bg-red-500",
  debug: "bg-gray-400 dark:bg-zinc-600",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const ALL_LEVELS: (LogLevel | "all")[] = ["all", "info", "warn", "error", "debug"];
const ALL_SOURCES: (LogSource | "all")[] = ["all", "build", "runtime", "test"];

export default function LogsPage() {
  const logs = getLogs();
  const deployments = getDeployments();
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<LogSource | "all">("all");
  const [search, setSearch] = useState("");
  const [depFilter, setDepFilter] = useState("all");

  const filtered = useMemo(() =>
    logs.filter((l) => {
      if (levelFilter !== "all" && l.level !== levelFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (depFilter !== "all" && l.deploymentId !== depFilter) return false;
      if (search && !l.message.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
    [logs, levelFilter, sourceFilter, depFilter, search]
  );

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logs</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">Build, runtime, and test logs across all deployments</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
          />
        </div>
        {/* Level */}
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as LogLevel | "all")}
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
        >
          {ALL_LEVELS.map((l) => <option key={l} value={l}>Level: {l}</option>)}
        </select>
        {/* Source */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as LogSource | "all")}
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
        >
          {ALL_SOURCES.map((s) => <option key={s} value={s}>Source: {s}</option>)}
        </select>
        {/* Deployment */}
        <select
          value={depFilter}
          onChange={(e) => setDepFilter(e.target.value)}
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
        >
          <option value="all">All deployments</option>
          {deployments.map((d) => <option key={d.id} value={d.id}>{d.project} — {d.id}</option>)}
        </select>
        <span className="text-xs text-gray-400 dark:text-zinc-500 ml-auto">{filtered.length} entries</span>
      </div>

      {/* Log viewer */}
      <div className="bg-gray-950 dark:bg-black rounded-xl border border-gray-800 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 dark:border-zinc-800 bg-gray-900 dark:bg-zinc-950">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-60" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-60" />
          </div>
          <span className="text-xs text-gray-500 dark:text-zinc-500 font-mono ml-2">secdev — logs</span>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-600 dark:text-zinc-600">
            <Circle className="w-2 h-2 fill-green-500 text-green-500" />
            Live
          </div>
        </div>
        <div className="p-4 space-y-1.5 min-h-[400px] max-h-[600px] overflow-y-auto font-mono text-xs">
          {filtered.length === 0 && (
            <p className="text-gray-600 dark:text-zinc-600 py-8 text-center">No log entries match your filters.</p>
          )}
          {filtered.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-0.5">
              <span className="text-gray-600 dark:text-zinc-600 shrink-0 tabular-nums">{fmt(log.timestamp)}</span>
              <span className={`flex items-center gap-1 shrink-0 font-semibold uppercase w-14 ${LEVEL_CLS[log.level]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${LEVEL_DOT[log.level]}`} />
                {log.level}
              </span>
              <span className="px-1.5 py-0 rounded text-gray-500 dark:text-zinc-500 bg-gray-900 dark:bg-zinc-900 shrink-0">{log.source}</span>
              <span className="text-gray-300 dark:text-zinc-300 break-all">{log.message}</span>
            </div>
          ))}
          <div className="h-1 w-full" />
          <p className="text-green-500 animate-pulse">█</p>
        </div>
      </div>
    </div>
  );
}
