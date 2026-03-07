"use client";
import { useState } from "react";
import { getTestResults } from "@/lib/mock-api";
import type { TestType, TestStatus } from "@/lib/mock-api";
import { CheckCircle2, XCircle, Clock, SkipForward, RefreshCw } from "lucide-react";

const TYPE_TABS: (TestType | "all")[] = ["all", "security", "api", "performance", "unit"];

const TYPE_COLORS: Record<TestType, string> = {
  security:    "bg-red-50    text-red-700    border-red-200    dark:bg-red-500/10    dark:text-red-400    dark:border-red-500/20",
  api:         "bg-blue-50   text-blue-700   border-blue-200   dark:bg-blue-500/10   dark:text-blue-400   dark:border-blue-500/20",
  performance: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
  unit:        "bg-gray-100  text-gray-700   border-gray-200   dark:bg-zinc-800     dark:text-zinc-400   dark:border-zinc-700",
};

function StatusIcon({ status }: { status: TestStatus }) {
  if (status === "passed") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-500" />;
  return <SkipForward className="w-4 h-4 text-gray-400 dark:text-zinc-500" />;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TestingPage() {
  const results = getTestResults();
  const [tab, setTab] = useState<TestType | "all">("all");
  const [running, setRunning] = useState(false);

  const filtered = tab === "all" ? results : results.filter((r) => r.type === tab);
  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  const runTests = () => {
    setRunning(true);
    setTimeout(() => setRunning(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Test Suite</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">Automated security, API, performance, and unit tests</p>
        </div>
        <button
          onClick={runTests}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Running…" : "Run All Tests"}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{passed}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Tests passed</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-8 h-8 text-red-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{failed}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Tests failed</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-gray-400 dark:text-zinc-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{skipped}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Skipped</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Overall Pass Rate</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{Math.round((passed / results.length) * 100)}%</p>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${(passed / results.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">{passed} of {results.length} tests passing</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg w-fit">
        {TYPE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
              tab === t
                ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.map((r) => (
          <div key={r.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex items-start gap-4">
            <StatusIcon status={r.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{r.name}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[r.type]}`}>
                  {r.type}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">{r.details}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-mono text-gray-500 dark:text-zinc-400">{r.duration}ms</p>
              <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">{fmt(r.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
