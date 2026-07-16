"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search, BookOpen, ShieldAlert, HelpCircle, Command } from "lucide-react";

type Kind = "Lesson" | "Vulnerability" | "Quiz";
interface Entry { id: string; kind: Kind; title: string; body: string; href: string; }

const INDEX: Entry[] = [
  { id: "l1", kind: "Lesson", title: "Intro to Threat Modeling", body: "Identify assets, threats and mitigations using STRIDE.", href: "/console/vuln-learning-path" },
  { id: "l2", kind: "Lesson", title: "Secure SDLC Basics", body: "Integrate security into every phase of the software lifecycle.", href: "/console/secure-coding" },
  { id: "l3", kind: "Lesson", title: "Cryptography Foundations", body: "Symmetric, asymmetric and hashing primitives.", href: "/console/glossary" },
  { id: "v1", kind: "Vulnerability", title: "SQL Injection", body: "Untrusted input concatenated into SQL enables data theft.", href: "/console/severity-comparison" },
  { id: "v2", kind: "Vulnerability", title: "Cross-Site Scripting", body: "Injecting scripts into trusted pages to hijack sessions.", href: "/console/severity-comparison" },
  { id: "v3", kind: "Vulnerability", title: "Server-Side Request Forgery", body: "Abusing server-side requests to reach internal systems.", href: "/console/severity-comparison" },
  { id: "v4", kind: "Vulnerability", title: "Insecure Direct Object Ref", body: "Missing per-object authz exposes other users' data.", href: "/console/severity-comparison" },
  { id: "q1", kind: "Quiz", title: "OWASP Top 10 Quiz", body: "Test your knowledge of the OWASP Top 10 categories.", href: "/console/daily-challenge" },
  { id: "q2", kind: "Quiz", title: "Crypto Basics Quiz", body: "Salting, KDFs and when to use asymmetric crypto.", href: "/console/daily-challenge" },
];

const KINDS: { key: Kind | "All"; label: string; icon: React.ElementType }[] = [
  { key: "All", label: "All", icon: Search },
  { key: "Lesson", label: "Lessons", icon: BookOpen },
  { key: "Vulnerability", label: "Vulnerabilities", icon: ShieldAlert },
  { key: "Quiz", label: "Quizzes", icon: HelpCircle },
];

const KIND_COLOR: Record<Kind, string> = {
  Lesson: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  Vulnerability: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  Quiz: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
};

function highlight(text: string, q: string): ReactNode {
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

export default function GlobalSearchPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | "All">("All");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = query.toLowerCase().trim();
  const results = INDEX
    .filter((e) => kind === "All" || e.kind === kind)
    .filter((e) => !q || e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q))
    .sort((a, b) => {
      if (!q) return 0;
      const ai = a.title.toLowerCase().indexOf(q);
      const bi = b.title.toLowerCase().indexOf(q);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Search className="w-6 h-6" /> Global Search
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          One search across lessons, vulnerabilities and quizzes.
        </p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search everything…"
          className="w-full pl-9 pr-16 py-3 text-sm border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-gray-400 border border-gray-200 dark:border-zinc-700 rounded px-1.5 py-0.5">
          <Command className="w-3 h-3" /> K
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <button key={k.key} onClick={() => setKind(k.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              kind === k.key ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white" : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
            }`}>
            <k.icon className="w-3.5 h-3.5" /> {k.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-400">
          {results.length} result{results.length !== 1 ? "s" : ""}
          {query && <> for &quot;{query}&quot;</>}
        </p>
        {results.map((e) => (
          <a key={e.id} href={e.href}
            className="block p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${KIND_COLOR[e.kind]}`}>{e.kind}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{highlight(e.title, q)}</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{highlight(e.body, q)}</p>
          </a>
        ))}
        {results.length === 0 && <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-10">No results found.</p>}
      </div>
    </div>
  );
}
