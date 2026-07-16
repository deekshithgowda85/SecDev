"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Bookmark, Star, Search, Trash2, Plus, Download, ExternalLink, Tag,
  Filter,
} from "lucide-react";

interface Bookmark {
  id: string;
  title: string;
  url: string;
  category: string;
  favorite: boolean;
  createdAt: number;
}

const CATEGORIES = ["Article", "Tool", "Course", "Cheatsheet", "Video", "Other"];

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

const SAMPLE: Bookmark[] = [
  { id: "b1", title: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/", category: "Article", favorite: true, createdAt: Date.now() - 86400000 },
  { id: "b2", title: "PortSwigger Web Security Academy", url: "https://portswigger.net/web-security", category: "Course", favorite: false, createdAt: Date.now() - 3600000 },
];

export default function BookmarkManagerPage() {
  const [bookmarks, setBookmarks] = useLocalStorage<Bookmark[]>("secdev.bookmarks", SAMPLE);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [showFav, setShowFav] = useState(false);

  const add = () => {
    if (!title.trim() || !url.trim()) return;
    const safeUrl = /^https?:\/\//.test(url) ? url : `https://${url}`;
    setBookmarks((prev) => [...prev, { id: crypto.randomUUID(), title: title.trim(), url: safeUrl, category, favorite: false, createdAt: Date.now() }]);
    setTitle(""); setUrl("");
  };

  const remove = (id: string) => setBookmarks((prev) => prev.filter((b) => b.id !== id));
  const toggleFav = (id: string) =>
    setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, favorite: !b.favorite } : b)));

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return bookmarks
      .filter((b) => (catFilter === "all" || b.category === catFilter))
      .filter((b) => (showFav ? b.favorite : true))
      .filter((b) => (q === "" || b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)))
      .sort((a, b) => b.favorite - a.favorite || b.createdAt - a.createdAt);
  }, [bookmarks, query, catFilter, showFav]);

  const allCats = useMemo(() => ["all", ...Array.from(new Set(bookmarks.map((b) => b.category)))], [bookmarks]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = "bookmarks.json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bookmark className="w-6 h-6" /> Bookmark Manager
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Save and organize your security learning resources.
          </p>
        </div>
        <button onClick={exportJSON}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Add bookmark */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Add Bookmark</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={add}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search bookmarks..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
        </div>
        <button onClick={() => setShowFav((s) => !s)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
            showFav ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400" : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400"
          }`}>
          <Star className={`w-4 h-4 ${showFav ? "fill-current" : ""}`} /> Favorites
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        {allCats.map((c) => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              catFilter === c ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white" : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
            }`}>
            {c !== "all" && <Tag className="w-3 h-3" />} {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-10">No bookmarks found.</p>
        ) : (
          filtered.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => toggleFav(b.id)} className={b.favorite ? "text-amber-500" : "text-gray-300 dark:text-zinc-600 hover:text-amber-400"}>
                  <Star className={`w-4 h-4 ${b.favorite ? "fill-current" : ""}`} />
                </button>
                <div className="min-w-0">
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-900 dark:text-white hover:underline truncate flex items-center gap-1.5">
                    {b.title} <ExternalLink className="w-3 h-3 shrink-0 text-gray-400" />
                  </a>
                  <p className="text-xs text-gray-400 truncate">{b.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">{b.category}</span>
                <button onClick={() => remove(b.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
