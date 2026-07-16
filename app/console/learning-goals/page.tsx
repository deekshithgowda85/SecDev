"use client";

import { useEffect, useState } from "react";
import { Target, Flame, Bell, Plus, Trash2, Medal, History, CheckCircle2 } from "lucide-react";

interface Goal { id: string; title: string; target: number; unit: string; current: number; createdAt: string; reminderOn: boolean; reminderTime: string; }
interface Badge { id: string; label: string; desc: string; earned: (g: Goal[], streak: number) => boolean; }

const BADGES: Badge[] = [
  { id: "b1", label: "Goal Setter", desc: "Create your first goal", earned: (g) => g.length >= 1 },
  { id: "b2", label: "First Win", desc: "Complete one goal", earned: (g) => g.some((x) => x.current >= x.target) },
  { id: "b3", label: "Triple Threat", desc: "Complete 3 goals", earned: (g) => g.filter((x) => x.current >= x.target).length >= 3 },
  { id: "b4", label: "On Fire", desc: "Keep a 3-day streak", earned: (_g, s) => s >= 3 },
];

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

function todayKey() { return new Date().toISOString().slice(0, 10); }
function addDays(k: string, n: number) { const d = new Date(k + "T00:00:00"); d.setDate(d.getDate() + n); return todayKey(d); }

export default function LearningGoalsPage() {
  const [goals, setGoals] = useLocalStorage<Goal[]>("secdev.goals.list", [
    { id: "g0", title: "Finish Web App Security", target: 6, unit: "modules", current: 4, createdAt: addDays(todayKey(), -2), reminderOn: true, reminderTime: "09:00" },
  ]);
  const [activity, setActivity] = useLocalStorage<string[]>("secdev.goals.activity", [addDays(todayKey(), -1), todayKey()]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(5);
  const [unit, setUnit] = useState("modules");

  const streak = (() => {
    let count = 0; const d = new Date();
    if (!activity.includes(todayKey())) d.setDate(d.getDate() - 1);
    while (activity.includes(todayKey(d))) { count++; d.setDate(d.getDate() - 1); }
    return count;
  })();

  const create = () => {
    if (!title.trim() || target <= 0) return;
    setGoals((p) => [...p, { id: crypto.randomUUID(), title: title.trim(), target, unit, current: 0, createdAt: todayKey(), reminderOn: false, reminderTime: "09:00" }]);
    setTitle("");
  };

  const progress = (g: Goal) => Math.min(100, Math.round((g.current / g.target) * 100));

  const increment = (id: string) => {
    setGoals((p) => p.map((g) => (g.id === id ? { ...g, current: Math.min(g.target, g.current + 1) } : g)));
    const t = todayKey();
    setActivity((prev) => (prev.includes(t) ? prev : [...prev, t]));
  };

  const remove = (id: string) => setGoals((p) => p.filter((g) => g.id !== id));

  const toggleReminder = (id: string) =>
    setGoals((p) => p.map((g) => (g.id === id ? { ...g, reminderOn: !g.reminderOn } : g)));

  const earnedBadges = BADGES.filter((b) => b.earned(goals, streak));
  const completed = goals.filter((g) => g.current >= g.target);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Target className="w-6 h-6" /> Personal Learning Goals
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Set targets and keep a consistent pace.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Streak", value: streak, icon: Flame, color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10" },
          { label: "Active Goals", value: goals.length, icon: Target, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10" },
          { label: "Completed", value: completed.length, icon: CheckCircle2, color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10" },
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

      {/* Achievement badges */}
      <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Medal className="w-4 h-4 text-amber-500" /> Achievement Badges ({earnedBadges.length}/{BADGES.length})</h2>
        <div className="flex flex-wrap gap-2">
          {BADGES.map((b) => {
            const earned = earnedBadges.includes(b);
            return (
              <div key={b.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${earned ? "border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10" : "border-gray-200 dark:border-zinc-800 text-gray-400"}`}>
                <Medal className={`w-4 h-4 ${earned ? "text-amber-500" : "text-gray-300 dark:text-zinc-600"}`} />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{b.label}</p>
                  <p className="text-[10px] text-gray-400">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create goal */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">New Goal</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Study 5 modules"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Target</label>
            <input type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))}
              className="w-20 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Unit</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white">
              <option>modules</option><option>hours</option><option>challenges</option><option>notes</option>
            </select>
          </div>
          <button onClick={create} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Goals list */}
      <div className="space-y-3">
        {goals.length === 0 && <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-8">No goals yet — create one above.</p>}
        {goals.map((g) => {
          const done = g.current >= g.target;
          return (
            <div key={g.id} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{g.title}</h3>
                    {done && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{g.current}/{g.target} {g.unit} · created {g.createdAt}</p>
                  <div className="h-2 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden mt-2">
                    <div className={`h-full rounded-full ${done ? "bg-green-500" : "bg-indigo-500"}`} style={{ width: `${progress(g)}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleReminder(g.id)} title="Toggle reminder"
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border ${g.reminderOn ? "border-amber-300 dark:border-amber-500/30 text-amber-500 bg-amber-50 dark:bg-amber-500/10" : "border-gray-200 dark:border-zinc-700 text-gray-400"}`}>
                    <Bell className="w-4 h-4" />
                  </button>
                  {!done && <button onClick={() => increment(g.id)} className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-lg transition-colors">+1</button>}
                  <button onClick={() => remove(g.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {g.reminderOn && (
                <div className="flex items-center gap-2 mt-3">
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs text-gray-500 dark:text-zinc-400">Daily reminder at</span>
                  <input type="time" value={g.reminderTime} disabled
                    className="px-2 py-1 text-xs border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* History */}
      {completed.length > 0 && (
        <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><History className="w-4 h-4 text-gray-400" /> Goal History</h2>
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {completed.map((g) => (
              <div key={g.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{g.title}</span>
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
