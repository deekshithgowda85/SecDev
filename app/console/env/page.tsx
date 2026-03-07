"use client";
import { useState } from "react";
import { getEnvVariables } from "@/lib/mock-api";
import type { EnvVariable, EnvEnvironment } from "@/lib/mock-api";
import { Plus, Eye, EyeOff, Trash2, Edit3, Copy, Check } from "lucide-react";

const ENV_TABS: EnvEnvironment[] = ["production", "development", "preview"];

function EnvRow({ ev, onDelete }: { ev: EnvVariable; onDelete: (id: string) => void }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(ev.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
      <td className="px-5 py-3.5 font-mono text-sm font-medium text-gray-900 dark:text-white">
        <div className="flex items-center gap-2">
          {ev.key}
          <button onClick={copy} className="text-gray-400 dark:text-zinc-600 hover:text-indigo-500 transition-colors">
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </td>
      <td className="px-5 py-3.5 font-mono text-sm text-gray-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span>{shown ? ev.value : "•".repeat(Math.min(ev.value.length, 20))}</span>
          <button onClick={() => setShown(!shown)} className="text-gray-400 dark:text-zinc-600 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors">
            {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
          ev.environment === "production"
            ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20"
            : ev.environment === "development"
            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
            : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20"
        }`}>
          {ev.environment}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-1">
          <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(ev.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function EnvPage() {
  const initial = getEnvVariables();
  const [vars, setVars] = useState<EnvVariable[]>(initial);
  const [tab, setTab] = useState<EnvEnvironment>("production");
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [newEnv, setNewEnv] = useState<EnvEnvironment>("production");

  const filtered = vars.filter((v) => v.environment === tab);

  const deleteVar = (id: string) => setVars((prev) => prev.filter((v) => v.id !== id));

  const addVar = () => {
    if (!newKey.trim()) return;
    setVars((prev) => [
      ...prev,
      { id: `env_${Date.now()}`, key: newKey, value: newVal, environment: newEnv, createdAt: new Date().toISOString() },
    ]);
    setNewKey(""); setNewVal(""); setShowAdd(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Environment Variables</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">{vars.length} variables across all environments</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Variable
        </button>
      </div>

      {/* Add variable inline form */}
      {showAdd && (
        <div className="bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-600/40 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">New Environment Variable</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toUpperCase())}
              placeholder="VARIABLE_NAME"
              className="font-mono bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
            />
            <input
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              placeholder="value..."
              type="password"
              className="font-mono bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
            />
            <select
              value={newEnv}
              onChange={(e) => setNewEnv(e.target.value as EnvEnvironment)}
              className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
            >
              {ENV_TABS.map((e) => <option key={e}>{e}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">Cancel</button>
            <button onClick={addVar} className="px-3 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">Save</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg w-fit">
        {ENV_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
              tab === t
                ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Key</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Value</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Environment</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {filtered.map((ev) => (
                <EnvRow key={ev.id} ev={ev} onDelete={deleteVar} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400 dark:text-zinc-500">
                    No variables in {tab} environment. Click &quot;Add Variable&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
