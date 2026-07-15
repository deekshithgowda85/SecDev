"use client";

import { useEffect, useState } from "react";
import {
  GitCompareArrows, Search, Plus, X, ShieldAlert, AlertTriangle, Wrench,
  Flame,
} from "lucide-react";

interface Vuln {
  id: string;
  name: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  risk: string;
  scenario: string;
  mitigation: string;
}

const VULNS: Vuln[] = [
  { id: "v1", name: "SQL Injection", severity: "High", risk: "Data breach, auth bypass", scenario: "Login with ' OR '1'='1 bypasses credential check.", mitigation: "Use parameterized queries / ORM; validate input; least-privilege DB accounts." },
  { id: "v2", name: "Cross-Site Scripting (XSS)", severity: "Medium", risk: "Session theft, defacement", scenario: "Reflecting unescaped <script> in page output.", mitigation: "Escape output, set CSP, sanitize with DOMPurify." },
  { id: "v3", name: "Remote Code Execution", severity: "Critical", risk: "Full system compromise", scenario: "Unsafe eval() on user-controlled input.", mitigation: "Avoid dynamic code execution; sandbox; strict input validation." },
  { id: "v4", name: "Server-Side Request Forgery", severity: "High", risk: "Internal network access", scenario: "Attacker makes server fetch internal metadata endpoints.", mitigation: "Allowlist destinations; block private IP ranges; use egress controls." },
  { id: "v5", name: "Insecure Direct Object Ref", severity: "Medium", risk: "Unauthorized data access", scenario: "Changing ?id=1001 to ?id=1002 reveals another user's record.", mitigation: "Enforce per-object authorization checks server-side." },
  { id: "v6", name: "Cross-Site Request Forgery", severity: "Low", risk: "Unintended state changes", scenario: "Auto-submitted form transfers funds while user is logged in.", mitigation: "Use anti-CSRF tokens and SameSite cookies." },
  { id: "v7", name: "Path Traversal", severity: "High", risk: "Arbitrary file read", scenario: "../../etc/passwd in a file parameter.", mitigation: "Canonicalize paths; allowlist base directories; validate input." },
  { id: "v8", name: "Weak Cryptography", severity: "Medium", risk: "Decryption of secrets", scenario: "Using MD5 for password storage.", mitigation: "Use Argon2/bcrypt; TLS 1.3; modern ciphers." },
];

const SEV_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
const SEV_COLOR: Record<string, string> = {
  Critical: "bg-red-100 text-red-800 border-red-300 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  High: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30",
  Low: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
};

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

export default function SeverityComparisonPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useLocalStorage<string[]>("secdev.severity.compare", ["v3", "v1"]);

  const filtered = VULNS.filter((v) =>
    query === "" || v.name.toLowerCase().includes(query.toLowerCase()) || v.risk.toLowerCase().includes(query.toLowerCase())
  );

  const selectedVulns = VULNS.filter((v) => selected.includes(v.id));

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <GitCompareArrows className="w-6 h-6" /> Vulnerability Severity Comparison
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Compare vulnerability classes side-by-side by severity, risk and mitigation.
        </p>
      </div>

      {/* Search + add */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search vulnerabilities..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        {/* Picker */}
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 space-y-1.5 max-h-[60vh] overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Add to Compare ({selected.length})</p>
          {filtered.map((v) => {
            const on = selected.includes(v.id);
            return (
              <button key={v.id} onClick={() => toggle(v.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors ${
                  on ? "border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-500/5" : "border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"
                }`}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{v.name}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${SEV_COLOR[v.severity]}`}>{v.severity}</span>
                </div>
                {on ? <X className="w-4 h-4 text-gray-400" /> : <Plus className="w-4 h-4 text-gray-400" />}
              </button>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-6">No matches.</p>}
        </div>

        {/* Side-by-side */}
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-x-auto">
          {selectedVulns.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
              <ShieldAlert className="w-12 h-12 text-gray-300 dark:text-zinc-600 mb-3" />
              <p className="text-sm text-gray-400 dark:text-zinc-500">Select vulnerabilities to compare.</p>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${selectedVulns.length}, minmax(180px, 1fr))` }}>
              {selectedVulns.map((v) => (
                <div key={v.id} className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <div className="p-3 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{v.name}</p>
                    <span className={`mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SEV_COLOR[v.severity]}`}>{v.severity}</span>
                  </div>
                  <div className="p-3 space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1"><Flame className="w-3 h-3" /> Risk</p>
                      <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5">{v.risk}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Example</p>
                      <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5">{v.scenario}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1"><Wrench className="w-3 h-3" /> Mitigation</p>
                      <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5">{v.mitigation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selectedVulns.length >= 2 && (
            <div className="mt-4 text-xs text-gray-500 dark:text-zinc-400 border-t border-gray-200 dark:border-zinc-800 pt-3">
              Highest severity in view: <span className="font-semibold">{[...selectedVulns].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])[0].severity}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
