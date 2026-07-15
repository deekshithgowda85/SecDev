"use client";

import { useEffect, useState } from "react";
import { BookA, Search, Star, Tag } from "lucide-react";

interface Term { term: string; category: string; definition: string; related: string[]; }

const GLOSSARY: Term[] = [
  { term: "Authentication", category: "Identity", definition: "Verifying the identity of a user or system before granting access.", related: ["Authorization", "MFA"] },
  { term: "Authorization", category: "Identity", definition: "Determining what actions an authenticated entity is permitted to perform.", related: ["Authentication", "RBAC"] },
  { term: "Advanced Persistent Threat", category: "Threats", definition: "A stealthy, long-term intrusion campaign typically backed by a nation-state.", related: ["Threat Actor"] },
  { term: "Buffer Overflow", category: "Vulnerabilities", definition: "Writing beyond a buffer's bounds, potentially enabling arbitrary code execution.", related: ["RCE", "Memory Corruption"] },
  { term: "CSRF", category: "Vulnerabilities", definition: "Cross-Site Request Forgery: forcing authenticated users to perform unwanted actions.", related: ["XSS", "SameSite"] },
  { term: "CSP", category: "Defense", definition: "Content Security Policy: an HTTP header restricting script sources to mitigate XSS.", related: ["XSS"] },
  { term: "Cryptography", category: "Crypto", definition: "The practice of securing communication through mathematical techniques.", related: ["Encryption", "Hashing"] },
  { term: "DDOS", category: "Threats", definition: "Distributed Denial of Service: overwhelming a target with traffic from many sources.", related: ["Threat Actor"] },
  { term: "Encryption", category: "Crypto", definition: "Transforming data so only authorized parties can read it.", related: ["Cryptography", "TLS"] },
  { term: "Hashing", category: "Crypto", definition: "One-way function producing a fixed digest, used for integrity and passwords.", related: ["Cryptography", "Argon2"] },
  { term: "Injection", category: "Vulnerabilities", definition: "Inserting untrusted input into an interpreter, e.g. SQL or command injection.", related: ["SQLi", "XSS"] },
  { term: "JWT", category: "Identity", definition: "JSON Web Token: a signed, compact token for transmitting claims.", related: ["Authentication", "Authorization"] },
  { term: "MFA", category: "Identity", definition: "Multi-Factor Authentication: requiring two or more independent proofs of identity.", related: ["Authentication"] },
  { term: "Phishing", category: "Threats", definition: "Deceptive messages that trick victims into revealing credentials or installing malware.", related: ["Social Engineering"] },
  { term: "RCE", category: "Vulnerabilities", definition: "Remote Code Execution: an attacker runs arbitrary code on a target system.", related: ["Buffer Overflow"] },
  { term: "RBAC", category: "Identity", definition: "Role-Based Access Control: permissions assigned via roles.", related: ["Authorization"] },
  { term: "SQLi", category: "Vulnerabilities", definition: "SQL Injection: injecting SQL via untrusted input to manipulate a database.", related: ["Injection"] },
  { term: "SameSite", category: "Defense", definition: "A cookie attribute that limits cross-site sending, helping mitigate CSRF.", related: ["CSRF"] },
  { term: "Social Engineering", category: "Threats", definition: "Manipulating people into divulging information or performing insecure actions.", related: ["Phishing"] },
  { term: "TLS", category: "Crypto", definition: "Transport Layer Security: encrypts traffic between client and server.", related: ["Encryption"] },
  { term: "Threat Actor", category: "Threats", definition: "An individual or group responsible for malicious cyber activity.", related: ["APT", "DDOS"] },
  { term: "XSS", category: "Vulnerabilities", definition: "Cross-Site Scripting: injecting malicious scripts into trusted web pages.", related: ["CSP", "Injection"] },
  { term: "Zero-Day", category: "Threats", definition: "A vulnerability unknown to the vendor and lacking a patch.", related: ["Threat Actor"] },
  { term: "Argon2", category: "Crypto", definition: "A memory-hard password-hashing function, winner of the PHC.", related: ["Hashing"] },
  { term: "VPN", category: "Defense", definition: "Virtual Private Network: an encrypted tunnel over an untrusted network.", related: ["TLS"] },
];

const CATEGORIES = ["All", ...Array.from(new Set(GLOSSARY.map((g) => g.category))).sort()];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-500/30 text-gray-900 dark:text-white rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function GlossaryPage() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [letter, setLetter] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useLocalStorage<string[]>("secdev.glossary.bookmarks", []);

  const toggleBookmark = (t: string) =>
    setBookmarks((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const filtered = GLOSSARY
    .filter((g) => cat === "All" || g.category === cat)
    .filter((g) => !letter || g.term.toUpperCase().startsWith(letter))
    .filter((g) => {
      const q = query.toLowerCase().trim();
      return !q || g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q);
    })
    .sort((a, b) => a.term.localeCompare(b.term));

  const byTerm = (t: string) => GLOSSARY.find((g) => g.term === t);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BookA className="w-6 h-6" /> Security Glossary
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Quick, searchable definitions of essential cybersecurity terms.
        </p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Smart search terms or definitions..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
      </div>

      {/* Alphabetical index */}
      <div className="flex flex-wrap gap-1">
        <button onClick={() => setLetter(null)} className={`w-7 h-7 text-xs rounded-lg border ${letter === null ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white" : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400"}`}>All</button>
        {LETTERS.map((l) => {
          const has = GLOSSARY.some((g) => g.term.toUpperCase().startsWith(l));
          return (
            <button key={l} disabled={!has} onClick={() => setLetter(l)}
              className={`w-7 h-7 text-xs rounded-lg border ${letter === l ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white" : has ? "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800" : "border-gray-100 dark:border-zinc-800 text-gray-300 dark:text-zinc-700 cursor-default"}`}>
              {l}
            </button>
          );
        })}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Tag className="w-4 h-4 text-gray-400" />
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-3 py-1.5 text-xs rounded-lg border ${cat === c ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white" : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-10">No matching terms.</p>}
        {filtered.map((g) => (
          <div key={g.term} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{highlight(g.term, query)}</h3>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">{g.category}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">{highlight(g.definition, query)}</p>
                {g.related.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-gray-400">Related:</span>
                    {g.related.map((r) => {
                      const exists = byTerm(r);
                      return exists ? (
                        <button key={r} onClick={() => setQuery(r)} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:underline">{r}</button>
                      ) : <span key={r} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-400">{r}</span>;
                    })}
                  </div>
                )}
              </div>
              <button onClick={() => toggleBookmark(g.term)}
                className={bookmarks.includes(g.term) ? "text-amber-500 shrink-0" : "text-gray-300 dark:text-zinc-600 hover:text-amber-400 shrink-0"}>
                <Star className={`w-4 h-4 ${bookmarks.includes(g.term) ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {bookmarks.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-2"><Star className="w-3.5 h-3.5 fill-current" /> Bookmarked ({bookmarks.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {bookmarks.map((b) => <button key={b} onClick={() => setQuery(b)} className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 hover:underline">{b}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}
