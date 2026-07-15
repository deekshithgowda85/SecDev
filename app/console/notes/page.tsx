"use client";

import { useEffect, useState } from "react";
import {
  NotebookPen, Search, Pin, PinOff, Trash2, Plus, Download, Eye, Pencil,
  FileDown,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: number;
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

const SAMPLE: Note[] = [
  { id: "n1", title: "XSS Cheatsheet", body: "# XSS\n- Use **CSP** headers\n- Escape `innerHTML`\n- `DOMPurify.sanitize()`", pinned: true, updatedAt: Date.now() - 86400000 },
  { id: "n2", title: "JWT Notes", body: "## JWT\n- Verify `alg` is not `none`\n- Short `exp`\n- Store in httpOnly cookie", pinned: false, updatedAt: Date.now() - 3600000 },
];

// Minimal, safe markdown -> HTML (no external deps)
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function renderMarkdown(md: string): string {
  const lines = escapeHtml(md).split("\n");
  const html: string[] = [];
  let inCode = false;
  for (const line of lines) {
    if (line.startsWith("```")) { inCode = !inCode; html.push(inCode ? "<pre class='whitespace-pre-wrap'>" : "</pre>"); continue; }
    if (inCode) { html.push(line); continue; }
    if (line.startsWith("### ")) html.push(`<h3 class='text-sm font-bold mt-2 mb-1'>${line.slice(4)}</h3>`);
    else if (line.startsWith("## ")) html.push(`<h2 class='text-base font-bold mt-2 mb-1'>${line.slice(3)}</h2>`);
    else if (line.startsWith("# ")) html.push(`<h1 class='text-lg font-bold mt-2 mb-1'>${line.slice(2)}</h1>`);
    else if (/^[-*] /.test(line)) html.push(`<li class='ml-4 list-disc'>${inline(line.slice(2))}</li>`);
    else if (line.trim() === "") html.push("<br/>");
    else html.push(`<p class='my-1'>${inline(line)}</p>`);
  }
  return html.join("\n");
}
function inline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code class='px-1 bg-gray-100 dark:bg-zinc-800 rounded text-xs'>$1</code>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-indigo-600 dark:text-indigo-400 underline">$1</a>');
}

export default function NotesWorkspacePage() {
  const [notes, setNotes] = useLocalStorage<Note[]>("secdev.notes", SAMPLE);
  const [activeId, setActiveId] = useState<string | null>(SAMPLE[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(true);

  const filtered = [...notes]
    .filter((n) => query === "" || n.title.toLowerCase().includes(query.toLowerCase()) || n.body.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);

  const active = notes.find((n) => n.id === activeId) ?? null;

  const create = () => {
    const id = crypto.randomUUID();
    setNotes((prev) => [...prev, { id, title: "Untitled Note", body: "", pinned: false, updatedAt: Date.now() }]);
    setActiveId(id); setSaved(true);
  };

  const updateActive = (patch: Partial<Note>) => {
    setSaved(false);
    setNotes((prev) => prev.map((n) => (n.id === activeId ? { ...n, ...patch, updatedAt: Date.now() } : n)));
    setSaved(true);
  };

  const remove = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const togglePin = (id: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = "security-notes.json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  };

  const exportMd = () => {
    const text = notes.map((n) => `# ${n.title}\n\n${n.body}`).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/markdown" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = "security-notes.md";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <NotebookPen className="w-6 h-6" /> Security Notes Workspace
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Markdown notes linked to your learning — auto-saved locally.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportMd} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"><FileDown className="w-4 h-4" /> .md</button>
          <button onClick={exportAll} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Sidebar list */}
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
          </div>
          <button onClick={create}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Note
          </button>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {filtered.map((n) => (
              <div key={n.id}
                className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${activeId === n.id ? "bg-gray-100 dark:bg-zinc-800" : "hover:bg-gray-50 dark:hover:bg-zinc-800"}`}
                onClick={() => setActiveId(n.id)}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{n.title || "Untitled"}</p>
                  <p className="text-xs text-gray-400 truncate">{n.body.split("\n")[0] || "Empty"}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); togglePin(n.id); }}
                  className={n.pinned ? "text-amber-500" : "text-gray-300 dark:text-zinc-600 hover:text-amber-400"}>
                  {n.pinned ? <Pin className="w-4 h-4 fill-current" /> : <PinOff className="w-4 h-4" />}
                </button>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-6">No notes.</p>}
          </div>
        </div>

        {/* Editor */}
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          {active ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <input value={active.title} onChange={(e) => updateActive({ title: e.target.value })}
                  placeholder="Note title"
                  className="flex-1 text-lg font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder:text-gray-400" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{saved ? "Saved" : "Saving…"}</span>
                  <button onClick={() => setPreview((p) => !p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                    {preview ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {preview ? "Edit" : "Preview"}
                  </button>
                  <button onClick={() => remove(active.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {preview ? (
                <div className="prose-invert max-w-none text-sm text-gray-700 dark:text-zinc-300 min-h-[50vh] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(active.body) }} />
              ) : (
                <textarea value={active.body} onChange={(e) => updateActive({ body: e.target.value })}
                  placeholder="Write your notes in Markdown…"
                  className="w-full min-h-[50vh] resize-none bg-transparent outline-none text-sm text-gray-700 dark:text-zinc-300 font-mono leading-relaxed" />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <NotebookPen className="w-12 h-12 text-gray-300 dark:text-zinc-600 mb-3" />
              <p className="text-sm text-gray-400 dark:text-zinc-500 mb-4">No note selected.</p>
              <button onClick={create} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Create Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
