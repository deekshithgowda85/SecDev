"use client";

import { useEffect, useState } from "react";
import {
  Code2, Copy, Download, Printer, Search, Filter, Check, ListChecks,
} from "lucide-react";

interface CheckItem { id: string; text: string; }
interface Category { name: string; items: CheckItem[]; }
interface LangChecklist { language: string; categories: Category[]; }

const DATA: LangChecklist[] = [
  {
    language: "JavaScript / TypeScript",
    categories: [
      { name: "Input Validation", items: [
        { id: "js1", text: "Validate and sanitize all user input at the boundary" },
        { id: "js2", text: "Use parameterized queries; never concatenate SQL" },
        { id: "js3", text: "Escape output to prevent XSS (e.g. DOMPurify)" },
      ]},
      { name: "Authentication", items: [
        { id: "js4", text: "Hash passwords with bcrypt/argon2, never plaintext" },
        { id: "js5", text: "Enforce rate limiting on login endpoints" },
        { id: "js6", text: "Use short-lived tokens with secure, httpOnly cookies" },
      ]},
      { name: "Dependencies", items: [
        { id: "js7", text: "Run npm audit and pin/lock dependency versions" },
        { id: "js8", text: "Remove unused packages to shrink attack surface" },
      ]},
    ],
  },
  {
    language: "Python",
    categories: [
      { name: "Input Validation", items: [
        { id: "py1", text: "Use parameterized cursors for all DB queries" },
        { id: "py2", text: "Validate input with pydantic/schema models" },
        { id: "py3", text: "Avoid eval/exec on untrusted data" },
      ]},
      { name: "Authentication", items: [
        { id: "py4", text: "Store passwords with passlib/bcrypt" },
        { id: "py5", text: "Set secure, httponly session cookies" },
      ]},
      { name: "Secrets", items: [
        { id: "py6", text: "Load secrets from environment, never hardcode" },
        { id: "py7", text: "Add .env to .gitignore and scan commits" },
      ]},
    ],
  },
  {
    language: "Java",
    categories: [
      { name: "Input Validation", items: [
        { id: "ja1", text: "Use PreparedStatement to avoid SQL injection" },
        { id: "ja2", text: "Validate beans with Jakarta validation" },
      ]},
      { name: "Authentication", items: [
        { id: "ja3", text: "Use a vetted auth framework (Spring Security)" },
        { id: "ja4", text: "Enforce password hashing with PBKDF2/BCrypt" },
      ]},
      { name: "Serialization", items: [
        { id: "ja5", text: "Avoid native Java deserialization of untrusted data" },
        { id: "ja6", text: "Whitelist classes for any object input streams" },
      ]},
    ],
  },
  {
    language: "Go",
    categories: [
      { name: "Input Validation", items: [
        { id: "go1", text: "Bind and validate request data with struct tags" },
        { id: "go2", text: "Escape HTML/templates via html/template" },
      ]},
      { name: "Authentication", items: [
        { id: "go3", text: "Use bcrypt for password hashing" },
        { id: "go4", text: "Set secure cookie flags (HttpOnly, Secure)" },
      ]},
      { name: "Concurrency", items: [
        { id: "go5", text: "Guard shared state with mutexes or channels" },
        { id: "go6", text: "Set context timeouts on external calls" },
      ]},
    ],
  },
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

export default function SecureCodingPage() {
  const languages = DATA.map((d) => d.language);
  const [lang, setLang] = useState(languages[0]);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [checked, setChecked] = useLocalStorage<Record<string, boolean>>("secdev.securecoding.checked", {});

  const checklist = DATA.find((d) => d.language === lang) ?? DATA[0];
  const cats = checklist.categories.map((c) => c.name);

  const visible = (() => {
    const q = query.toLowerCase();
    return checklist.categories
      .filter((c) => catFilter === "all" || c.name === catFilter)
      .map((c) => ({ ...c, items: c.items.filter((i) => q === "" || i.text.toLowerCase().includes(q)) }))
      .filter((c) => c.items.length > 0);
  })();

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const allItems = checklist.categories.flatMap((c) => c.items);
  const doneCount = allItems.filter((i) => checked[i.id]).length;

  const copy = () => {
    const text = `# Secure Coding Checklist — ${lang}\n\n` +
      visible.map((c) => `## ${c.name}\n` + c.items.map((i) => `- [${checked[i.id] ? "x" : " "}] ${i.text}`).join("\n")).join("\n\n");
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  const download = () => {
    const blob = new Blob([JSON.stringify({ language: lang, categories: checklist.categories }, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `secure-coding-${lang.split(" ")[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  };

  const print = () => window.print();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Code2 className="w-6 h-6" /> Secure Coding Checklist
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Language-specific security checklists to follow consistently.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copy} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"><Copy className="w-4 h-4" /> Copy</button>
          <button onClick={download} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"><Download className="w-4 h-4" /> JSON</button>
          <button onClick={print} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"><Printer className="w-4 h-4" /> PDF</button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div>
          <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Language</label>
          <select value={lang} onChange={(e) => { setLang(e.target.value); setCatFilter("all"); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white">
            {languages.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search checklist..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <button onClick={() => setCatFilter("all")}
            className={`px-3 py-1.5 text-xs rounded-lg border ${catFilter === "all" ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white" : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400"}`}>All</button>
          {cats.map((c) => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 text-xs rounded-lg border ${catFilter === c ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white" : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400"}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${allItems.length ? (doneCount / allItems.length) * 100 : 0}%` }} />
        </div>
        <span className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1"><ListChecks className="w-4 h-4" /> {doneCount}/{allItems.length}</span>
      </div>

      {/* Checklist */}
      <div className="space-y-4">
        {visible.map((c) => (
          <div key={c.name} className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{c.name}</h2>
            <div className="space-y-2">
              {c.items.map((i) => (
                <label key={i.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                  <span className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${checked[i.id] ? "bg-green-500 border-green-500" : "border-gray-300 dark:border-zinc-600"}`}>
                    {checked[i.id] && <Check className="w-3.5 h-3.5 text-white" />}
                  </span>
                  <input type="checkbox" checked={checked[i.id] ?? false} onChange={() => toggle(i.id)} className="sr-only" />
                  <span className={`text-sm ${checked[i.id] ? "text-gray-400 line-through" : "text-gray-700 dark:text-zinc-300"}`}>{i.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {visible.length === 0 && <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-10">No matching checklist items.</p>}
      </div>
    </div>
  );
}
