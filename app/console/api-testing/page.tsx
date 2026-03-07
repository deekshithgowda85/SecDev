"use client";
import { useState } from "react";
import { getApiEndpoints } from "@/lib/mock-api";
import { Play, CheckCircle2, XCircle, RefreshCw, Clock } from "lucide-react";

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-blue-50   text-blue-700   border-blue-200   dark:bg-blue-500/10   dark:text-blue-400   dark:border-blue-500/20",
  POST:   "bg-green-50  text-green-700  border-green-200  dark:bg-green-500/10  dark:text-green-400  dark:border-green-500/20",
  PUT:    "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20",
  DELETE: "bg-red-50    text-red-700    border-red-200    dark:bg-red-500/10    dark:text-red-400    dark:border-red-500/20",
  PATCH:  "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
};

function StatusBadge({ status, ok }: { status: number; ok: boolean }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
      ok ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
    }`}>
      {status}
    </span>
  );
}

function LatencyBadge({ ms }: { ms: number }) {
  const color = ms < 200 ? "text-green-600 dark:text-green-400" : ms < 1000 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";
  return <span className={`text-xs font-mono font-semibold ${color}`}>{ms}ms</span>;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function ApiTestingPage() {
  const endpoints = getApiEndpoints();
  const [running, setRunning] = useState<string | null>(null);

  const runTest = (id: string) => {
    setRunning(id);
    setTimeout(() => setRunning(null), 1500);
  };

  const passed = endpoints.filter((e) => e.passed).length;
  const failed = endpoints.filter((e) => !e.passed).length;
  const avgLatency = Math.round(endpoints.reduce((s, e) => s + e.latency, 0) / endpoints.length);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Testing</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">Automated endpoint testing and response validation</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          onClick={() => endpoints.forEach((e) => runTest(e.id))}
        >
          <Play className="w-4 h-4" /> Run All Tests
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
          <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{passed}</p><p className="text-xs text-gray-500 dark:text-zinc-500">Endpoints passing</p></div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-8 h-8 text-red-500 shrink-0" />
          <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{failed}</p><p className="text-xs text-gray-500 dark:text-zinc-500">Endpoints failing</p></div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-500 shrink-0" />
          <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{avgLatency}ms</p><p className="text-xs text-gray-500 dark:text-zinc-500">Avg. latency</p></div>
        </div>
      </div>

      {/* Endpoint table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-zinc-800">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Method</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Endpoint</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Latency</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide hidden md:table-cell">Last Tested</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Result</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Run</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {endpoints.map((ep) => (
              <tr key={ep.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${METHOD_COLORS[ep.method]}`}>{ep.method}</span>
                </td>
                <td className="px-5 py-3.5 font-mono text-sm text-gray-700 dark:text-zinc-300">{ep.path}</td>
                <td className="px-5 py-3.5"><StatusBadge status={ep.status} ok={ep.status < 400} /></td>
                <td className="px-5 py-3.5"><LatencyBadge ms={ep.latency} /></td>
                <td className="px-5 py-3.5 hidden md:table-cell text-xs text-gray-400 dark:text-zinc-500">{fmt(ep.lastTested)}</td>
                <td className="px-5 py-3.5">
                  {ep.passed
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <XCircle className="w-4 h-4 text-red-500" />
                  }
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => runTest(ep.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors ml-auto"
                  >
                    {running === ep.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
