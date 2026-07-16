"use client";

import { useEffect, useState } from "react";
import { Award, Printer, Share2, UserRound, CalendarDays, GraduationCap } from "lucide-react";

interface Module { id: string; title: string; hours: number; }
interface CertRecord { moduleId: string; date: string; }

const MODULES: Module[] = [
  { id: "m1", title: "Web App Security", hours: 6 },
  { id: "m2", title: "Cryptography Essentials", hours: 5 },
  { id: "m3", title: "OWASP Top 10", hours: 4 },
  { id: "m4", title: "Secure Coding", hours: 5 },
  { id: "m5", title: "Cloud Security", hours: 6 },
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

export default function CertificatesPage() {
  const [name, setName] = useLocalStorage<string>("secdev.certs.name", "Alex Learner");
  const [records, setRecords] = useLocalStorage<CertRecord[]>("secdev.certs.records", [
    { moduleId: "m1", date: "2026-02-10" },
    { moduleId: "m3", date: "2026-03-22" },
  ]);
  const [viewId, setViewId] = useState<string | null>("m1");

  const issue = (id: string) =>
    setRecords((prev) => (prev.some((r) => r.moduleId === id) ? prev : [...prev, { moduleId: id, date: todayKey() }]));

  const revoke = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.moduleId !== id));
    if (viewId === id) setViewId(null);
  };

  const record = records.find((r) => r.moduleId === viewId) ?? null;
  const mod = record ? MODULES.find((m) => m.id === record.moduleId) ?? null : null;

  const printPdf = () => window.print();

  const share = () => {
    if (!record || !module) return;
    const text = `🏆 SecDev Certificate of Completion\nName: ${name}\nModule: ${module.title}\nDate: ${record.date}`;
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <style>{`@media print { body * { visibility: hidden; } #cert, #cert * { visibility: visible; } #cert { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Award className="w-6 h-6" /> Completion Certificates
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Downloadable recognition for finished modules.</p>
      </div>

      {/* Name */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-3">
        <UserRound className="w-5 h-5 text-gray-400" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
          className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white font-medium" />
        <span className="text-xs text-gray-400">Shown on certificates</span>
      </div>

      {/* Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULES.map((m) => {
          const rec = records.find((r) => r.moduleId === m.id);
          const isView = viewId === m.id;
          return (
            <div key={m.id}
              className={`p-4 rounded-xl border transition-colors ${isView ? "border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-500/5" : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{m.title}</span>
                </div>
                <span className="text-xs text-gray-400">{m.hours}h</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {rec ? (
                  <>
                    <button onClick={() => setViewId(m.id)} className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-lg transition-colors">View</button>
                    <button onClick={() => revoke(m.id)} className="px-3 py-1.5 text-xs text-gray-500 dark:text-zinc-400 hover:text-red-500 transition-colors">Revoke</button>
                  </>
                ) : (
                  <button onClick={() => { issue(m.id); setViewId(m.id); }} className="flex-1 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">Issue Certificate</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Certificate preview */}
      {record && mod ? (
        <div id="cert" className="relative p-8 rounded-xl border-2 border-indigo-300 dark:border-indigo-500/40 bg-gradient-to-br from-indigo-50/40 to-white dark:from-indigo-500/10 dark:to-zinc-900 text-center">
          <div className="absolute inset-2 rounded-lg border border-dashed border-indigo-200 dark:border-indigo-500/30 pointer-events-none" />
          <Award className="w-12 h-12 mx-auto text-indigo-500 mb-3" />
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-500 uppercase">Certificate of Completion</p>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-4">This certifies that</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white my-1">{name || "Unnamed Learner"}</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400">has successfully completed the module</p>
          <p className="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mt-2">{mod.title}</p>
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {record.date}</span>
            <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> {mod.hours} hours</span>
          </div>
          <div className="mt-6 pt-3 border-t border-dashed border-gray-200 dark:border-zinc-700 max-w-[200px] mx-auto">
            <p className="text-[10px] text-gray-400">SecDev Learning Platform</p>
          </div>
        </div>
      ) : (
        <div className="p-10 rounded-xl border border-dashed border-gray-200 dark:border-zinc-800 text-center text-gray-400 dark:text-zinc-500">
          <Award className="w-10 h-10 mx-auto mb-2 opacity-50" />
          Issue a certificate above to preview it here.
        </div>
      )}

      {record && mod && (
        <div className="flex items-center gap-2">
          <button onClick={printPdf} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-lg transition-colors">
            <Printer className="w-4 h-4" /> Download PDF
          </button>
          <button onClick={share} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      )}
    </div>
  );
}
