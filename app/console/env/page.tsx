"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Plus, Trash2, RefreshCw, KeyRound } from "lucide-react";

interface MaskedVar {
  key: string;
  maskedValue: string;
}

export default function Page() {
  const [project, setProject] = useState("");
  const [projectInput, setProjectInput] = useState("");
  const [vars, setVars] = useState<MaskedVar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New variable form
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);

  // Reveal state per-key
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState<string | null>(null);

  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const fetchVars = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/env-vars?project=${encodeURIComponent(project)}`);
      const data = await res.json();
      if (data.ok) {
        setVars(data.vars ?? []);
        setRevealed({});
      } else {
        setError(data.error ?? "Failed to load vars");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    fetchVars();
  }, [fetchVars]);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleLoadProject = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = projectInput.trim();
    if (!trimmed) return;
    setProject(trimmed);
  };

  const handleReveal = async (key: string) => {
    if (revealed[key] !== undefined) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    setRevealing(key);
    try {
      const res = await fetch(
        `/api/env-vars?project=${encodeURIComponent(project)}&reveal=1`
      );
      const data = await res.json();
      if (data.ok) {
        const found = (data.vars as { key: string; value: string }[]).find(
          (v) => v.key === key
        );
        if (found) {
          setRevealed((prev) => ({ ...prev, [key]: found.value }));
        }
      }
    } finally {
      setRevealing(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const k = newKey.trim();
    const v = newValue;
    if (!k || !v || !project) return;

    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/env-vars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, key: k, value: v }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewKey("");
        setNewValue("");
        await fetchVars();
        flash(`Added ${k}`);
      } else {
        setError(data.error ?? "Failed to add var");
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!project) return;
    setDeletingKey(key);
    try {
      const res = await fetch("/api/env-vars", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, key }),
      });
      const data = await res.json();
      if (data.ok) {
        setVars((prev) => prev.filter((v) => v.key !== key));
        setRevealed((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        flash(`Deleted ${key}`);
      } else {
        setError(data.error ?? "Failed to delete");
      }
    } catch {
      setError("Network error");
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Environment Variables
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Per-project secrets injected at deploy time — values encrypted at rest with AES-256-GCM
        </p>
      </div>

      {/* Project selector */}
      <form onSubmit={handleLoadProject} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Repository name (e.g. my-app)"
          value={projectInput}
          onChange={(e) => setProjectInput(e.target.value)}
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors"
        >
          Load
        </button>
      </form>

      {error && (
        <div className="px-4 py-3 mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 mb-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {project && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              {project} · {vars.length} variable{vars.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={fetchVars}
              disabled={loading}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Vars table */}
          {vars.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl mb-4">
              <KeyRound className="w-8 h-8 text-gray-300 dark:text-zinc-600 mb-3" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                No variables for {project}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                Add your first variable below.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider w-1/2">
                      Key
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {vars.map(({ key, maskedValue }) => (
                    <tr key={key} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900 dark:text-white">
                        {key}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500 dark:text-zinc-400 select-all break-all">
                            {revealed[key] !== undefined ? revealed[key] : maskedValue}
                          </span>
                          <button
                            onClick={() => handleReveal(key)}
                            disabled={revealing === key}
                            className="shrink-0 p-1 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            title={revealed[key] !== undefined ? "Hide" : "Reveal"}
                          >
                            {revealed[key] !== undefined ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(key)}
                          disabled={deletingKey === key}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add new var form */}
          <form
            onSubmit={handleAdd}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4"
          >
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              Add Variable
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="KEY_NAME"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                className="w-40 px-3 py-2 text-sm font-mono bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
                required
                pattern="[A-Za-z_][A-Za-z0-9_]*"
              />
              <input
                type="text"
                placeholder="value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
                required
              />
              <button
                type="submit"
                disabled={adding || !newKey || !newValue}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {adding ? "Adding…" : "Add"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

