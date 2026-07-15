"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShieldAlert, CheckCircle2, Circle, Award, ArrowRight, GraduationCap,
  Lock, Server, Bug,
} from "lucide-react";

type Tier = "Beginner" | "Intermediate" | "Advanced";

interface VPath {
  id: string;
  title: string;
  tier: Tier;
  summary: string;
}

const PATHS: VPath[] = [
  { id: "v1", title: "Injection (SQLi)", tier: "Beginner", summary: "Understand and exploit SQL injection, then parameterize queries." },
  { id: "v2", title: "XSS Fundamentals", tier: "Beginner", summary: "Reflected, stored and DOM-based cross-site scripting." },
  { id: "v3", title: "Broken Access Control", tier: "Beginner", summary: "IDOR, privilege escalation and forced browsing." },
  { id: "v4", title: "SSRF", tier: "Intermediate", summary: "Server-side request forgery and internal network pivoting." },
  { id: "v5", title: "Insecure Deserialization", tier: "Intermediate", summary: "Object injection and gadget chains." },
  { id: "v6", title: "XML External Entities", tier: "Intermediate", summary: "XXE attacks and file disclosure." },
  { id: "v7", title: "Race Conditions", tier: "Advanced", summary: "TOCTOU and concurrent request abuse." },
  { id: "v8", title: "Prototype Pollution", tier: "Advanced", summary: "JavaScript object pollution and RCE chains." },
  { id: "v9", title: "Memory Corruption", tier: "Advanced", summary: "Buffer overflows, heap spray and ROP." },
];

const TIER_COLOR: Record<Tier, string> = {
  Beginner: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20",
  Intermediate: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
  Advanced: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
};
const TIER_ICON: Record<Tier, React.ElementType> = { Beginner: Lock, Intermediate: Server, Advanced: Bug };

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

export default function VulnLearningPathPage() {
  const [done, setDone] = useLocalStorage<string[]>("secdev.vulnpath.done", []);

  const toggle = (id: string) =>
    setDone((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const tiers = useMemo(
    () => (["Beginner", "Intermediate", "Advanced"] as Tier[]).map((t) => {
      const items = PATHS.filter((p) => p.tier === t);
      const completed = items.filter((p) => done.includes(p.id)).length;
      return { tier: t, items, completed, pct: Math.round((completed / items.length) * 100) };
    }),
    [done]
  );

  const nextTopic = useMemo(() => PATHS.find((p) => !done.includes(p.id)) ?? null, [done]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6" /> Vulnerability Learning Path
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          A guided, progressive sequence through vulnerability classes.
        </p>
      </div>

      {/* Recommended next */}
      <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5">
        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide mb-1">Recommended Next Topic</p>
        {nextTopic ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ArrowRight className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{nextTopic.title}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">{nextTopic.summary}</p>
              </div>
            </div>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${TIER_COLOR[nextTopic.tier]}`}>{nextTopic.tier}</span>
          </div>
        ) : (
          <p className="text-sm text-gray-700 dark:text-zinc-300 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> You&apos;ve completed every path. 🎓</p>
        )}
      </div>

      {tiers.map(({ tier, items, completed, pct }) => {
        const Icon = TIER_ICON[tier];
        const certified = completed === items.length && items.length > 0;
        return (
          <div key={tier} className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{tier} Path</h2>
                <span className="text-xs text-gray-400">({completed}/{items.length})</span>
              </div>
              {certified && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 px-2.5 py-1 rounded-full">
                  <Award className="w-3.5 h-3.5" /> Certificate Earned
                </span>
              )}
            </div>
            <div className="h-2 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden mb-4">
              <div className={`h-full rounded-full ${tier === "Beginner" ? "bg-green-500" : tier === "Intermediate" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="space-y-2">
              {items.map((p) => {
                const isDone = done.includes(p.id);
                return (
                  <button key={p.id} onClick={() => toggle(p.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                      isDone ? "border-green-200 dark:border-green-500/30 bg-green-50/40 dark:bg-green-500/5" : "border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"
                    }`}>
                    <div className="flex items-center gap-3">
                      {isDone ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-gray-300 dark:text-zinc-600" />}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.title}</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">{p.summary}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
