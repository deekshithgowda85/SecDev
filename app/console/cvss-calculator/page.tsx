"use client";

import { useEffect, useState } from "react";
import { Calculator, RotateCcw, Info } from "lucide-react";

type Metric = "AV" | "AC" | "PR" | "UI" | "S" | "C" | "I" | "A";

const OPTIONS: Record<Metric, { label: string; values: { key: string; label: string; weight: number }[] }> = {
  AV: { label: "Attack Vector", values: [
    { key: "N", label: "Network", weight: 0.85 },
    { key: "A", label: "Adjacent", weight: 0.62 },
    { key: "L", label: "Local", weight: 0.55 },
    { key: "P", label: "Physical", weight: 0.2 },
  ]},
  AC: { label: "Attack Complexity", values: [
    { key: "L", label: "Low", weight: 0.77 },
    { key: "H", label: "High", weight: 0.44 },
  ]},
  PR: { label: "Privileges Required", values: [
    { key: "N", label: "None", weight: 0.85 },
    { key: "L", label: "Low", weight: 0.62 },
    { key: "H", label: "High", weight: 0.27 },
  ]},
  UI: { label: "User Interaction", values: [
    { key: "N", label: "None", weight: 0.85 },
    { key: "R", label: "Required", weight: 0.62 },
  ]},
  S: { label: "Scope", values: [
    { key: "U", label: "Unchanged", weight: 0 },
    { key: "C", label: "Changed", weight: 1 },
  ]},
  C: { label: "Confidentiality", values: [
    { key: "H", label: "High", weight: 0.56 },
    { key: "L", label: "Low", weight: 0.22 },
    { key: "N", label: "None", weight: 0 },
  ]},
  I: { label: "Integrity", values: [
    { key: "H", label: "High", weight: 0.56 },
    { key: "L", label: "Low", weight: 0.22 },
    { key: "N", label: "None", weight: 0 },
  ]},
  A: { label: "Availability", values: [
    { key: "H", label: "High", weight: 0.56 },
    { key: "L", label: "Low", weight: 0.22 },
    { key: "N", label: "None", weight: 0 },
  ]},
};

const METRIC_ORDER: Metric[] = ["AV", "AC", "PR", "UI", "S", "C", "I", "A"];

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate local value after mount
      if (raw) setValue(JSON.parse(raw) as T);
    } catch { /* ignore */ }
  }, [key]);
  const update = (next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try { localStorage.setItem(key, JSON.stringify(resolved)); } catch { /* ignore */ }
      return resolved;
    });
  };
  return [value, update] as const;
}

function roundup(input: number): number {
  const intInput = Math.round(input * 100000);
  if (intInput === 0) return 0;
  if (intInput % 10000 === 0) return intInput / 100000;
  return (Math.floor(intInput / 10000) + 1) / 10;
}

function computeScore(m: Record<Metric, string>): number {
  const w = (met: Metric, key: string) => OPTIONS[met].values.find((v) => v.key === key)!.weight;
  const av = w("AV", m.AV), ac = w("AC", m.AC), ui = w("UI", m.UI);
  const pr = m.S === "C"
    ? (m.PR === "N" ? 0.85 : m.PR === "L" ? 0.68 : 0.5)
    : (m.PR === "N" ? 0.85 : m.PR === "L" ? 0.62 : 0.27);

  const c = w("C", m.C), i = w("I", m.I), a = w("A", m.A);
  const iscBase = 1 - (1 - c) * (1 - i) * (1 - a);
  const scopeChanged = m.S === "C";
  const impact = scopeChanged ? 7.52 * (iscBase - 0.029) - 3.25 * Math.pow(iscBase - 0.02, 15) : 6.42 * iscBase;
  const exploitability = 8.22 * av * ac * pr * ui;

  if (impact <= 0) return 0;
  const raw = scopeChanged ? Math.min(1.08 * (impact + exploitability), 10) : Math.min(impact + exploitability, 10);
  return roundup(raw);
}

function severity(score: number): { label: string; color: string } {
  if (score === 0) return { label: "None", color: "text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800" };
  if (score < 4) return { label: "Low", color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10" };
  if (score < 7) return { label: "Medium", color: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10" };
  if (score < 9) return { label: "High", color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10" };
  return { label: "Critical", color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10" };
}

export default function CvssCalculatorPage() {
  const [sel, setSel] = useLocalStorage<Record<Metric, string>>("secdev.cvss.sel", {
    AV: "N", AC: "L", PR: "N", UI: "N", S: "U", C: "H", I: "H", A: "H",
  });

  const score = computeScore(sel);
  const sev = severity(score);
  const vector = `CVSS:3.1/AV:${sel.AV}/AC:${sel.AC}/PR:${sel.PR}/UI:${sel.UI}/S:${sel.S}/C:${sel.C}/I:${sel.I}/A:${sel.A}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-6 h-6" /> CVSS Score Calculator
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Adjust CVSS v3.1 base metrics to see the score update in real time.
        </p>
      </div>

      {/* Score */}
      <div className="p-6 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-6">
        <div className="text-center">
          <p className="text-5xl font-bold text-gray-900 dark:text-white">{score.toFixed(1)}</p>
          <span className={`mt-2 inline-block text-xs font-semibold px-3 py-1 rounded-full ${sev.color}`}>{sev.label}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Vector String</p>
          <code className="block text-xs text-gray-700 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-800 rounded-lg px-3 py-2 break-all font-mono">{vector}</code>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Base score reflects exploitability and impact. Environmental/temporal metrics are out of scope here.
          </p>
        </div>
        <button onClick={() => setSel({ AV: "N", AC: "L", PR: "N", UI: "N", S: "U", C: "H", I: "H", A: "H" })}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors self-start">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {METRIC_ORDER.map((met) => (
          <div key={met} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{OPTIONS[met].label}</span>
              <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{met}:{sel[met]}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {OPTIONS[met].values.map((opt) => (
                <button key={opt.key} onClick={() => setSel((p) => ({ ...p, [met]: opt.key }))}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                    sel[met] === opt.key
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white"
                      : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
