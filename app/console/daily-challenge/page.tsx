"use client";

import { useEffect, useState } from "react";
import { Flame, CheckCircle2, Trophy, CalendarDays, Target } from "lucide-react";

type Difficulty = "Easy" | "Medium" | "Hard";
interface Challenge { id: string; title: string; kind: "Quiz" | "Code" | "CTF"; difficulty: Difficulty; prompt: string; }

const POOL: Challenge[] = [
  { id: "c1", title: "Spot the SQLi", kind: "Quiz", difficulty: "Easy", prompt: "Identify which input sanitization prevents SQL injection in a login form." },
  { id: "c2", title: "Harden the Header", kind: "Code", difficulty: "Easy", prompt: "Add a Content-Security-Policy header that only allows same-origin scripts." },
  { id: "c3", title: "Decode the Hash", kind: "CTF", difficulty: "Medium", prompt: "Given an unsalted MD5 of a common password, explain why it is weak and how to improve it." },
  { id: "c4", title: "Find the IDOR", kind: "Quiz", difficulty: "Medium", prompt: "A profile URL uses ?user_id=12. What control prevents viewing user 13's data?" },
  { id: "c5", title: "Patch the XSS", kind: "Code", difficulty: "Medium", prompt: "Render user bio safely in React without using dangerouslySetInnerHTML." },
  { id: "c6", title: "Trace the SSRF", kind: "CTF", difficulty: "Hard", prompt: "Describe how an attacker could reach 169.254.169.254 and what egress controls block it." },
  { id: "c7", title: "Validate the JWT", kind: "Quiz", difficulty: "Hard", prompt: "List three checks a server must perform before trusting a JWT." },
  { id: "c8", title: "Escaping Output", kind: "Code", difficulty: "Easy", prompt: "Show the correct way to escape HTML special characters before inserting user text into the DOM." },
];

const LEADERBOARD = [
  { name: "sec_sam", points: 1840 },
  { name: "byte_bella", points: 1620 },
  { name: "You", points: 0, you: true },
  { name: "root_raj", points: 1390 },
  { name: "nano_nia", points: 1175 },
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

function dayKey(d = new Date()) { return d.toISOString().slice(0, 10); }
function dayIndex(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return Math.floor(d.getTime() / 86400000);
}
function pickChallenge(dateStr: string): Challenge {
  const idx = ((dayIndex(dateStr) % POOL.length) + POOL.length) % POOL.length;
  return POOL[idx];
}

export default function DailyChallengePage() {
  const [completed, setCompleted] = useLocalStorage<string[]>("secdev.challenge.completed", []);
  const today = dayKey();
  const todayChallenge = pickChallenge(today);
  const doneToday = completed.includes(today);

  const complete = () => setCompleted((p) => (p.includes(today) ? p : [...p, today]));

  const streak = (() => {
    let count = 0;
    const d = new Date();
    if (!completed.includes(dayKey(d))) d.setDate(d.getDate() - 1);
    while (completed.includes(dayKey(d))) { count++; d.setDate(d.getDate() - 1); }
    return count;
  })();

  const leaderboard = LEADERBOARD.map((r) => ({ ...r, points: r.you ? completed.length * 50 + 100 : r.points }))
    .sort((a, b) => b.points - a.points);

  const archive = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dayKey(d);
    return { key: k, challenge: pickChallenge(k), done: completed.includes(k) };
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Target className="w-6 h-6" /> Daily Cybersecurity Challenge
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Build skills one challenge at a time.</p>
      </div>

      {/* Daily challenge */}
      <div className="p-6 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {today}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            todayChallenge.difficulty === "Easy" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
              : todayChallenge.difficulty === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
              : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
          }`}>{todayChallenge.kind} · {todayChallenge.difficulty}</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{todayChallenge.title}</h2>
        <p className="text-sm text-gray-600 dark:text-zinc-300 mt-2">{todayChallenge.prompt}</p>
        <button onClick={complete} disabled={doneToday}
          className={`mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            doneToday ? "bg-green-500 text-white cursor-default" : "bg-gray-900 text-white hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900"
          }`}>
          {doneToday ? <><CheckCircle2 className="w-4 h-4" /> Completed</> : "Mark as Done"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Streak", value: streak, icon: Flame, color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10" },
          { label: "Completed", value: completed.length, icon: CheckCircle2, color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10" },
          { label: "Rank", value: `#${leaderboard.findIndex((r) => r.you) + 1}`, icon: Trophy, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10" },
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

      {/* Leaderboard */}
      <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Leaderboard</h2>
        <div className="space-y-1.5">
          {leaderboard.map((r, i) => (
            <div key={r.name} className={`flex items-center justify-between px-3 py-2 rounded-lg ${r.you ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-gray-50 dark:hover:bg-zinc-800"}`}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-400 w-5">{i + 1}</span>
                <span className={`text-sm font-medium ${r.you ? "text-indigo-700 dark:text-indigo-400" : "text-gray-900 dark:text-white"}`}>{r.name}</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-zinc-400">{r.points} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Archive */}
      <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Challenge Archive</h2>
        <div className="space-y-1.5">
          {archive.map((a) => (
            <div key={a.key} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800">
              <div className="flex items-center gap-3">
                {a.done ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-zinc-600" />}
                <span className="text-sm text-gray-900 dark:text-white">{a.challenge.title}</span>
              </div>
              <span className="text-xs text-gray-400">{a.key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
