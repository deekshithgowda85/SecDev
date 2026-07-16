"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Trophy, Award, Medal, Flag, Share2, Plus, Trash2, Filter, BookOpen,
  GraduationCap,
} from "lucide-react";

type AchievementType = "module" | "badge" | "certificate" | "milestone";

interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
}

const TYPE_META: Record<AchievementType, { label: string; icon: React.ElementType; color: string; ring: string }> = {
  module: { label: "Module", icon: BookOpen, color: "text-blue-600 dark:text-blue-400", ring: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" },
  badge: { label: "Badge", icon: Medal, color: "text-amber-600 dark:text-amber-400", ring: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" },
  certificate: { label: "Certificate", icon: Award, color: "text-green-600 dark:text-green-400", ring: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20" },
  milestone: { label: "Milestone", icon: Flag, color: "text-purple-600 dark:text-purple-400", ring: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20" },
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

function todayKey() { return new Date().toISOString().slice(0, 10); }

const SAMPLE: Achievement[] = [
  { id: "a1", type: "milestone", title: "Started SecDev Journey", description: "Created your learning account.", date: "2026-01-05" },
  { id: "a2", type: "module", title: "Intro to Network Security", description: "Completed the foundational module.", date: "2026-01-20" },
  { id: "a3", type: "badge", title: "First Blood", description: "Earned your first security badge.", date: "2026-02-02" },
  { id: "a4", type: "certificate", title: "OWASP Top 10 Certified", description: "Passed the OWASP assessment.", date: "2026-03-15" },
];

export default function AchievementTimelinePage() {
  const [items, setItems] = useLocalStorage<Achievement[]>("secdev.achievements", SAMPLE);
  const [filter, setFilter] = useState<AchievementType | "all">("all");
  const [type, setType] = useState<AchievementType>("module");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayKey());
  const [shared, setShared] = useState<string | null>(null);

  const add = () => {
    if (!title.trim()) return;
    setItems((prev) => [...prev, { id: crypto.randomUUID(), type, title: title.trim(), description: description.trim(), date }]);
    setTitle(""); setDescription("");
  };

  const remove = (id: string) => setItems((prev) => prev.filter((a) => a.id !== id));

  const filtered = useMemo(
    () => [...items].filter((a) => filter === "all" || a.type === filter).sort((a, b) => b.date.localeCompare(a.date)),
    [items, filter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    (Object.keys(TYPE_META) as AchievementType[]).forEach((t) => (c[t] = items.filter((a) => a.type === t).length));
    return c;
  }, [items]);

  const share = () => {
    const lines = [
      "My Cybersecurity Learning Achievements",
      "========================================",
      ...[...items].sort((a, b) => a.date.localeCompare(b.date)).map(
        (a) => `- [${TYPE_META[a.type].label}] ${a.title} (${a.date})${a.description ? ": " + a.description : ""}`
      ),
      "",
      `Total: ${items.length} achievements`,
    ];
    const text = lines.join("\n");
    setShared(text);
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-6 h-6" /> Achievement Timeline
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            A chronological history of your learning milestones.
          </p>
        </div>
        <button onClick={share}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-lg transition-colors">
          <Share2 className="w-4 h-4" /> Share
        </button>
      </div>

      {/* Add achievement */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Add Achievement</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as AchievementType)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white">
              {(Object.keys(TYPE_META) as AchievementType[]).map((t) => (
                <option key={t} value={t}>{TYPE_META[t].label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Completed XSS Module"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
          </div>
        </div>
        <div className="flex items-end gap-3 mt-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
          </div>
          <button onClick={add}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        {(["all", "module", "badge", "certificate", "milestone"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filter === f
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white"
                : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
            }`}>
            {f === "all" ? "All" : TYPE_META[f].label} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative pl-6 border-l border-gray-200 dark:border-zinc-800 space-y-4">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-zinc-500">No achievements for this filter.</p>
        )}
        {filtered.map((a) => {
          const meta = TYPE_META[a.type];
          const Icon = meta.icon;
          return (
            <div key={a.id} className="relative">
              <span className={`absolute -left-[31px] top-1 w-6 h-6 rounded-full border flex items-center justify-center ${meta.ring}`}>
                <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
              </span>
              <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.ring} ${meta.color}`}>{meta.label}</span>
                      <span className="text-xs text-gray-400">{a.date}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-1.5">{a.title}</h3>
                    {a.description && <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{a.description}</p>}
                  </div>
                  <button onClick={() => remove(a.id)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {shared && (
        <div className="p-4 rounded-xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-2 mb-2">
            <GraduationCap className="w-4 h-4" /> Copied to clipboard — ready to share
          </p>
          <pre className="text-xs text-gray-700 dark:text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto">{shared}</pre>
        </div>
      )}
    </div>
  );
}
