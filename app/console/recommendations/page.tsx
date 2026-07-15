"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Sparkles, RefreshCw, Check, Star, ArrowRight, Route, Layers,
  GraduationCap, BookMarked,
} from "lucide-react";

type Difficulty = "Beginner" | "Intermediate" | "Advanced";

interface Module {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  summary: string;
  related: string[];
}

const MODULES: Module[] = [
  { id: "m1", title: "Security Fundamentals", category: "Basics", difficulty: "Beginner", summary: "Core concepts of CIA triad, threat modeling and risk.", related: ["Network Security", "Cryptography"] },
  { id: "m2", title: "Network Security 101", category: "Network", difficulty: "Beginner", summary: "Firewalls, VPNs, and secure network design basics.", related: ["Security Fundamentals", "Cloud Security"] },
  { id: "m3", title: "Web App Security", category: "Web", difficulty: "Intermediate", summary: "OWASP Top 10 and secure web development.", related: ["Secure Coding", "API Security"] },
  { id: "m4", title: "Cryptography Essentials", category: "Crypto", difficulty: "Intermediate", summary: "Symmetric/asymmetric encryption, hashing and TLS.", related: ["Security Fundamentals", "Cloud Security"] },
  { id: "m5", title: "Threat Hunting", category: "Defense", difficulty: "Advanced", summary: "Proactive detection and adversary emulation.", related: ["Malware Analysis", "Forensics"] },
  { id: "m6", title: "Malware Analysis", category: "Offense", difficulty: "Advanced", summary: "Static and dynamic analysis of malicious binaries.", related: ["Threat Hunting", "Forensics"] },
  { id: "m7", title: "Cloud Security", category: "Cloud", difficulty: "Intermediate", summary: "IAM, misconfigurations and cloud threat models.", related: ["Network Security 101", "Cryptography Essentials"] },
  { id: "m8", title: "Incident Response", category: "Defense", difficulty: "Advanced", summary: "Containment, eradication and recovery playbooks.", related: ["Threat Hunting", "Forensics"] },
];

const DIFF_ORDER: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];
const DIFF_COLOR: Record<Difficulty, string> = {
  Beginner: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10",
  Intermediate: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10",
  Advanced: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10",
};

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate local value after mount\n      if (raw) setValue(JSON.parse(raw) as T);
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

export default function RecommendationsPage() {
  const [completed, setCompleted] = useLocalStorage<string[]>("secdev.recommendations.completed", []);
  const [shuffle, setShuffle] = useState(0);

  const toggle = (id: string) =>
    setCompleted((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const highestDone = useMemo(() => {
    const done = MODULES.filter((m) => completed.includes(m.id));
    if (done.length === 0) return -1;
    return Math.max(...done.map((m) => DIFF_ORDER.indexOf(m.difficulty)));
  }, [completed]);

  // Recommendations: prefer next difficulty tier, else related to completed.
  const recommended = useMemo(() => {
    const remaining = MODULES.filter((m) => !completed.includes(m.id));
    const nextTier = highestDone + 1;
    const byTier = remaining
      .map((m) => ({ m, key: m.difficulty === DIFF_ORDER[nextTier] ? 0 : 1, rel: completed.some((c) => MODULES.find((x) => x.id === c)?.related.includes(m.title) || m.related.includes(MODULES.find((x) => x.id === c)?.title ?? "")) ? 0 : 1 }))
      .sort((a, b) => a.key - b.key || a.rel - b.rel);
    // apply refresh shuffle
    const ordered = byTier.map((x) => x.m);
    if (shuffle % 2 === 1) ordered.reverse();
    return ordered.slice(0, 4);
  }, [completed, highestDone, shuffle]);

  const roadmap = useMemo(
    () => DIFF_ORDER.map((d) => ({ tier: d, modules: MODULES.filter((m) => m.difficulty === d) })),
    []
  );

  const progressPct = Math.round((completed.length / MODULES.length) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> Learning Recommendations
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Personalized module suggestions based on your progress.
          </p>
        </div>
        <button onClick={() => setShuffle((s) => s + 1)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
          <RefreshCw className={`w-4 h-4 ${shuffle % 2 === 1 ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Progress */}
      <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Your Progress</p>
          <p className="text-xs text-gray-500 dark:text-zinc-400">{completed.length}/{MODULES.length} completed · {progressPct}%</p>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2">
          Current level: <span className="font-medium text-gray-700 dark:text-zinc-300">{DIFF_ORDER[highestDone + 1] ?? "Advanced — all tiers reached"}</span>
        </p>
      </div>

      {/* Recommendation cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" /> Suggested For You
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommended.map((m) => (
            <div key={m.id} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${DIFF_COLOR[m.difficulty]}`}>{m.difficulty}</span>
                <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{m.category}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{m.title}</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 mb-3">{m.summary}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Layers className="w-3 h-3" />
                  {m.related.slice(0, 2).join(", ")}
                </div>
                <button onClick={() => toggle(m.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-lg transition-colors">
                  <Check className="w-3.5 h-3.5" /> Mark Done
                </button>
              </div>
            </div>
          ))}
          {recommended.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-zinc-500 col-span-2">All modules completed. 🎉</p>
          )}
        </div>
      </div>

      {/* Learning roadmap */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Route className="w-4 h-4 text-indigo-500" /> Learning Roadmap
        </h2>
        <div className="space-y-3">
          {roadmap.map(({ tier, modules }) => (
            <div key={tier} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{tier}</span>
                <span className="text-xs text-gray-400">({modules.filter((m) => completed.includes(m.id)).length}/{modules.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {modules.map((m) => {
                  const done = completed.includes(m.id);
                  return (
                    <button key={m.id} onClick={() => toggle(m.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        done
                          ? "border-green-300 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                          : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                      }`}>
                      {done ? <Check className="w-3 h-3" /> : <BookMarked className="w-3 h-3" />}
                      {m.title}
                      {!done && <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
