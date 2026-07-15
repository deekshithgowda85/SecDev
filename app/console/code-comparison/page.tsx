"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Code2, Search, Download, ShieldX, ShieldCheck, FileCode2 } from "lucide-react";

interface Example { id: string; language: string; vulnType: string; vulnerable: string; secure: string; explanation: string; }

const EXAMPLES: Example[] = [
  {
    id: "e1", language: "JavaScript", vulnType: "SQL Injection",
    vulnerable: `const id = req.query.id;\nconst q = "SELECT * FROM users WHERE id = " + id;\ndb.query(q);`,
    secure: `const q = "SELECT * FROM users WHERE id = $1";\ndb.query(q, [req.query.id]);`,
    explanation: "Concatenating user input builds a string the DB parses as code. Parameterized queries send the value separately so it is never interpreted as SQL.",
  },
  {
    id: "e2", language: "Python", vulnType: "Command Injection",
    vulnerable: `import os\nos.system("ping -c1 " + host)`,
    secure: `import subprocess\nsubprocess.run(["ping", "-c", "1", host], check=True)`,
    explanation: "Passing a list (not a shell string) avoids a shell interpreter, so metacharacters like ; or && cannot inject commands.",
  },
  {
    id: "e3", language: "JavaScript", vulnType: "XSS",
    vulnerable: `el.innerHTML = "<b>" + user.name + "</b>";`,
    secure: `el.textContent = user.name;\n// or: el.innerHTML = DOMPurify.sanitize(html);`,
    explanation: "Assigning raw HTML lets attacker input become live markup. textContent escapes it; sanitizers allow safe subset.",
  },
  {
    id: "e4", language: "Java", vulnType: "Path Traversal",
    vulnerable: `new File("/data/" + req.param("file")).read()`,
    secure: `Path base = Paths.get("/data").normalize();\nPath p = base.resolve(req.param("file")).normalize();\nif (!p.startsWith(base)) throw new SecurityException();`,
    explanation: "Validating the resolved path stays within the base directory blocks ../../ escapes.",
  },
];

const LANGS = ["All", ...Array.from(new Set(EXAMPLES.map((e) => e.language)))];

const TOKEN = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(const|let|var|function|return|if|else|for|while|await|async|import|from|export|class|new|require|SELECT|FROM|WHERE|AND|OR|true|false|null)\b|\b(\d+)\b/g;

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code)) !== null) {
    if (m.index > last) out.push(<span key={k++}>{code.slice(last, m.index)}</span>);
    let cls = "text-purple-600 dark:text-purple-400";
    if (m[1]) cls = "text-gray-400 italic";
    else if (m[2]) cls = "text-green-600 dark:text-green-400";
    else if (m[3]) cls = "text-sky-600 dark:text-sky-400";
    else if (m[4]) cls = "text-amber-600 dark:text-amber-400";
    out.push(<span key={k++} className={cls}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < code.length) out.push(<span key={k++}>{code.slice(last)}</span>);
  return out;
}

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

export default function CodeComparisonPage() {
  const [lang, setLang] = useState("All");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useLocalStorage<string>("secdev.codecmp.active", EXAMPLES[0].id);

  const filtered = EXAMPLES
    .filter((e) => lang === "All" || e.language === lang)
    .filter((e) => {
      const q = query.toLowerCase();
      return !q || e.vulnType.toLowerCase().includes(q) || e.explanation.toLowerCase().includes(q) || e.language.toLowerCase().includes(q);
    });

  const active = filtered.find((e) => e.id === activeId) ?? filtered[0] ?? null;

  const download = (title: string, code: string) => {
    const blob = new Blob([code], { type: "text/plain" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `${title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileCode2 className="w-6 h-6" /> Secure Code Comparison
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Compare vulnerable and secure implementations side by side.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {LANGS.map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className={`px-3 py-1.5 text-xs rounded-lg border ${lang === l ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white" : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search type or explanation..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filtered.map((e) => (
          <button key={e.id} onClick={() => setActiveId(e.id)}
            className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg border transition-colors ${active?.id === e.id ? "border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-500/5" : "border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"}`}>
            <Code2 className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-900 dark:text-white font-medium">{e.vulnType}</span>
            <span className="text-gray-400">{e.language}</span>
          </button>
        ))}
      </div>

      {active ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5">
                <span className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400"><ShieldX className="w-4 h-4" /> Vulnerable</span>
                <button onClick={() => download(`${active.vulnType}-vuln`, active.vulnerable)} className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"><Download className="w-4 h-4" /></button>
              </div>
              <pre className="p-4 text-xs font-mono overflow-x-auto text-gray-700 dark:text-zinc-300 whitespace-pre">{highlight(active.vulnerable)}</pre>
            </div>
            <div className="rounded-xl border border-green-200 dark:border-green-500/30 bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-green-200 dark:border-green-500/30 bg-green-50/50 dark:bg-green-500/5">
                <span className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400"><ShieldCheck className="w-4 h-4" /> Secure</span>
                <button onClick={() => download(`${active.vulnType}-secure`, active.secure)} className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"><Download className="w-4 h-4" /></button>
              </div>
              <pre className="p-4 text-xs font-mono overflow-x-auto text-gray-700 dark:text-zinc-300 whitespace-pre">{highlight(active.secure)}</pre>
            </div>
          </div>
          <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Why it&apos;s safer</p>
            <p className="text-sm text-gray-600 dark:text-zinc-300">{active.explanation}</p>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-10">No matching examples.</p>
      )}
    </div>
  );
}
