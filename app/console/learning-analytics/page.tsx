"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Clock, CalendarDays, Flame, Download, Trash2, Plus, BarChart3, TrendingUp,
} from "lucide-react";

interface StudySession {
  id: string;
  topic: string;
  minutes: number;
  date: string; // YYYY-MM-DD
}

const TOPICS = [
  "Network Security", "Web App Security", "Cryptography", "Malware Analysis",
  "Forensics", "Cloud Security", "Social Engineering", "Secure Coding",
];

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

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
}

function weekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return todayKey(monday);
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export default function LearningAnalyticsPage() {
  const [sessions, setSessions] = useLocalStorage<StudySession[]>("secdev.analytics.sessions", []);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [minutes, setMinutes] = useState(30);
  const [date, setDate] = useState(todayKey());

  const addSession = () => {
    if (minutes <= 0) return;
    setSessions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), topic, minutes: Number(minutes), date },
    ]);
  };

  const removeSession = (id: string) =>
    setSessions((prev) => prev.filter((s) => s.id !== id));

  const sumMinutes = (arr: StudySession[]) => arr.reduce((a, s) => a + s.minutes, 0);

  // Daily (last 7 days)
  const days = lastNDays(7);
  const daily = useMemo(() => {
    const map = new Map<string, number>();
    days.forEach((d) => map.set(d, 0));
    sessions.forEach((s) => { if (map.has(s.date)) map.set(s.date, (map.get(s.date) ?? 0) + s.minutes); });
    return days.map((d) => ({ date: d, minutes: map.get(d) ?? 0 }));
  }, [sessions, days]);

  // Weekly trends (last 8 weeks)
  const weekly = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => {
      const wk = weekKey(s.date);
      map.set(wk, (map.get(wk) ?? 0) + s.minutes);
    });
    const weeks: { key: string; label: string; minutes: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i * 7);
      const wk = weekKey(todayKey(d));
      weeks.push({ key: wk, label: wk.slice(5), minutes: map.get(wk) ?? 0 });
    }
    return weeks;
  }, [sessions]);

  // Monthly reports
  const monthly = useMemo(() => {
    const map = new Map<string, { minutes: number; count: number }>();
    sessions.forEach((s) => {
      const mk = monthKey(s.date);
      const cur = map.get(mk) ?? { minutes: 0, count: 0 };
      map.set(mk, { minutes: cur.minutes + s.minutes, count: cur.count + 1 });
    });
    return Array.from(map.entries())
      .map(([m, v]) => ({ month: m, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [sessions]);

  // Topic distribution
  const topicDist = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => map.set(s.topic, (map.get(s.topic) ?? 0) + s.minutes));
    return Array.from(map.entries())
      .map(([t, m]) => ({ topic: t, minutes: m }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [sessions]);

  const maxDaily = Math.max(60, ...daily.map((d) => d.minutes));
  const maxWeekly = Math.max(60, ...weekly.map((w) => w.minutes));
  const maxTopic = Math.max(60, ...topicDist.map((t) => t.minutes));

  // Streak
  const streak = useMemo(() => {
    const set = new Set(sessions.map((s) => s.date));
    let count = 0;
    const d = new Date();
    // allow today to be empty without breaking streak
    if (!set.has(todayKey(d))) d.setDate(d.getDate() - 1);
    while (set.has(todayKey(d))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [sessions]);

  const weekMinutes = sumMinutes(sessions.filter((s) => weekKey(s.date) === weekKey(todayKey())));
  const todayMinutes = sumMinutes(sessions.filter((s) => s.date === todayKey()));
  const totalMinutes = sumMinutes(sessions);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ sessions, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "learning-analytics.json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const header = "date,topic,minutes\n";
    const rows = sessions.map((s) => `${s.date},${s.topic},${s.minutes}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "learning-analytics.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Learning Time Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Track study duration and build consistent learning habits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportJSON} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            <Download className="w-4 h-4" /> JSON
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Add session */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Log Study Session</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Topic</label>
            <select value={topic} onChange={(e) => setTopic(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white">
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Minutes</label>
            <input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-24 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
          </div>
          <button onClick={addSession}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today", value: todayMinutes, unit: "min", icon: Clock, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10" },
          { label: "This Week", value: weekMinutes, unit: "min", icon: CalendarDays, color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10" },
          { label: "Streak", value: streak, unit: "days", icon: Flame, color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10" },
          { label: "Total", value: Math.round(totalMinutes / 60 * 10) / 10, unit: "hrs", icon: TrendingUp, color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10" },
        ].map((s) => (
          <div key={s.label} className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">{s.label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value} <span className="text-sm font-normal text-gray-400">{s.unit}</span></p>
          </div>
        ))}
      </div>

      {/* Daily study time */}
      <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Daily Study Time <span className="text-gray-400 font-normal">(last 7 days)</span></h2>
        <div className="flex items-end gap-2 h-40">
          {daily.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center flex-1">
                <div className="w-full max-w-[28px] rounded-md bg-green-500/80 dark:bg-green-500/60 transition-all"
                  style={{ height: `${(d.minutes / maxDaily) * 100}%`, minHeight: d.minutes > 0 ? 4 : 0 }}
                  title={`${d.minutes} min`} />
              </div>
              <span className="text-[10px] text-gray-400">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly trends + Topic distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Weekly Trends</h2>
          <div className="flex items-end gap-1.5 h-36">
            {weekly.map((w) => (
              <div key={w.key} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center flex-1">
                  <div className="w-full max-w-[20px] rounded-md bg-indigo-500/80 dark:bg-indigo-500/60"
                    style={{ height: `${(w.minutes / maxWeekly) * 100}%`, minHeight: w.minutes > 0 ? 3 : 0 }}
                    title={`${w.minutes} min`} />
                </div>
                <span className="text-[9px] text-gray-400">{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Topic Distribution</h2>
          <div className="space-y-2.5 max-h-36 overflow-y-auto">
            {topicDist.length === 0 && <p className="text-sm text-gray-400 dark:text-zinc-500">No data yet.</p>}
            {topicDist.map((t) => (
              <div key={t.topic}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-zinc-400">{t.topic}</span>
                  <span className="text-gray-400">{Math.round(t.minutes / 60 * 10) / 10}h</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(t.minutes / maxTopic) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly reports */}
      <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Monthly Reports</h2>
        {monthly.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-zinc-500">No sessions logged.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800 text-xs uppercase text-gray-500 dark:text-zinc-400">
                <th className="text-left py-2">Month</th>
                <th className="text-right py-2">Hours</th>
                <th className="text-right py-2">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {monthly.map((m) => (
                <tr key={m.month}>
                  <td className="py-2 font-medium text-gray-900 dark:text-white">{m.month}</td>
                  <td className="py-2 text-right text-gray-600 dark:text-zinc-400">{Math.round(m.minutes / 60 * 10) / 10}</td>
                  <td className="py-2 text-right text-gray-600 dark:text-zinc-400">{m.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent sessions */}
      <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Logged Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-zinc-500">No sessions yet — log your first study session above.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {[...sessions].reverse().slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{s.topic}</span>
                  <span className="text-xs text-gray-400">{s.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-zinc-400">{s.minutes} min</span>
                  <button onClick={() => removeSession(s.id)} className="text-gray-400 hover:text-red-500 transition-colors">
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
