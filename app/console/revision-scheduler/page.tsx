"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CalendarClock, CheckCheck, Plus, Trash2, AlertTriangle, Flame, ListChecks,
  Bell,
} from "lucide-react";

interface Topic {
  id: string;
  name: string;
  priority: "Low" | "Medium" | "High";
  lastStudied: string; // YYYY-MM-DD
  reviewCount: number;
  lastReviewedOn: string | null;
}

const INTERVALS = [1, 3, 7, 16, 30, 60];

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

function todayKey(d = new Date()) { return d.toISOString().slice(0, 10); }
function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return todayKey(d);
}
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
}

const PRIORITY_WEIGHT: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

const SAMPLE: Topic[] = [
  { id: "t1", name: "XSS Prevention", priority: "High", lastStudied: addDays(todayKey(), -2), reviewCount: 1, lastReviewedOn: addDays(todayKey(), -2) },
  { id: "t2", name: "SQL Injection", priority: "Medium", lastStudied: addDays(todayKey(), -8), reviewCount: 2, lastReviewedOn: addDays(todayKey(), -8) },
  { id: "t3", name: "JWT Auth", priority: "Low", lastStudied: addDays(todayKey(), -1), reviewCount: 0, lastReviewedOn: null },
];

export default function RevisionSchedulerPage() {
  const [topics, setTopics] = useLocalStorage<Topic[]>("secdev.revision.topics", SAMPLE);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<Topic["priority"]>("Medium");

  const nextReview = (t: Topic) => addDays(t.lastReviewedOn ?? t.lastStudied, INTERVALS[Math.min(t.reviewCount, INTERVALS.length - 1)]);

  const add = () => {
    if (!name.trim()) return;
    setTopics((prev) => [...prev, { id: crypto.randomUUID(), name: name.trim(), priority, lastStudied: todayKey(), reviewCount: 0, lastReviewedOn: null }]);
    setName("");
  };

  const remove = (id: string) => setTopics((prev) => prev.filter((t) => t.id !== id));

  const complete = (id: string) =>
    setTopics((prev) => prev.map((t) =>
      t.id === id ? { ...t, reviewCount: t.reviewCount + 1, lastReviewedOn: todayKey(), lastStudied: t.lastStudied } : t
    ));

  const enriched = useMemo(
    () => topics.map((t) => {
      const due = nextReview(t);
      const overdue = daysBetween(todayKey(), due); // negative => due in future
      return { ...t, due, overdueDays: -overdue };
    }),
    [topics]
  );

  const dueToday = enriched.filter((t) => t.due <= todayKey());
  const sortedDue = [...dueToday].sort((a, b) => (b.priority === a.priority ? a.overdueDays - b.overdueDays : PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]));

  const mastered = enriched.filter((t) => t.reviewCount >= 3).length;
  const reviewedToday = enriched.filter((t) => t.lastReviewedOn === todayKey()).length;

  // 7-day calendar
  const week = Array.from({ length: 7 }, (_, i) => addDays(todayKey(), i));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CalendarClock className="w-6 h-6" /> Revision Scheduler
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Spaced-repetition reminders to retain what you learn.
        </p>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Due Today", value: dueToday.length, icon: Bell, color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10" },
          { label: "Reviewed Today", value: reviewedToday, icon: CheckCheck, color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10" },
          { label: "Topics", value: topics.length, icon: ListChecks, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10" },
          { label: "Mastered", value: mastered, icon: Flame, color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10" },
        ].map((s) => (
          <div key={s.label} className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">{s.label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Add topic */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Add Topic to Schedule</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Topic</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. OWASP A01 Broken Access Control"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Topic["priority"])}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white">
              <option>High</option><option>Medium</option><option>Low</option>
            </select>
          </div>
          <button onClick={add}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Daily suggestions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-500" /> Daily Suggestions
        </h2>
        {sortedDue.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-zinc-500 p-4 rounded-xl border border-dashed border-gray-200 dark:border-zinc-800">Nothing due today. 🎉</p>
        ) : (
          <div className="space-y-2">
            {sortedDue.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-4 h-4 ${t.overdueDays > 0 ? "text-red-500" : "text-amber-500"}`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    t.priority === "High" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                      : t.priority === "Medium" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                      : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>{t.priority}</span>
                  <span className="text-xs text-gray-400">{t.overdueDays > 0 ? `${t.overdueDays}d overdue` : "due today"}</span>
                </div>
                <button onClick={() => complete(t.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                  <CheckCheck className="w-3.5 h-3.5" /> Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review calendar */}
      <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Review Calendar <span className="text-gray-400 font-normal">(next 7 days)</span></h2>
        <div className="grid grid-cols-7 gap-2">
          {week.map((d) => {
            const due = enriched.filter((t) => t.due === d);
            const isToday = d === todayKey();
            return (
              <div key={d} className={`rounded-lg border p-2 min-h-[70px] ${isToday ? "border-indigo-400 dark:border-indigo-500/50 bg-indigo-50/40 dark:bg-indigo-500/5" : "border-gray-200 dark:border-zinc-800"}`}>
                <p className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400">{d.slice(5)}</p>
                <div className="mt-1 space-y-1">
                  {due.map((t) => (
                    <span key={t.id} className="block text-[9px] truncate bg-gray-100 dark:bg-zinc-800 rounded px-1 py-0.5 text-gray-600 dark:text-zinc-300" title={t.name}>{t.name}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All topics */}
      <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">All Topics</h2>
        {topics.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-zinc-500">No topics scheduled yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {enriched.sort((a, b) => a.due.localeCompare(b.due)).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${t.due <= todayKey() ? "bg-red-500" : "bg-gray-300 dark:bg-zinc-600"}`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</span>
                  <span className="text-xs text-gray-400">next: {t.due}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{t.reviewCount} reviews</span>
                  <button onClick={() => complete(t.id)} className="text-green-600 hover:text-green-700 transition-colors" title="Mark reviewed">
                    <CheckCheck className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
