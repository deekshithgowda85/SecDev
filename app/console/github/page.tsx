"use client";
import { useState } from "react";
import { Github, CheckCircle2, GitBranch, RefreshCw, Zap, ExternalLink, AlertCircle } from "lucide-react";

const REPOS = [
  { id: 1, name: "secdev-api", fullName: "deekshithgowda85/secdev-api", branch: "main", autoDeploy: true, webhookActive: true, lastSync: "2 min ago" },
  { id: 2, name: "SecDev", fullName: "deekshithgowda85/SecDev", branch: "main", autoDeploy: true, webhookActive: true, lastSync: "5 min ago" },
  { id: 3, name: "secdev-worker", fullName: "deekshithgowda85/secdev-worker", branch: "main", autoDeploy: false, webhookActive: false, lastSync: "1h ago" },
  { id: 4, name: "secdev-docs", fullName: "deekshithgowda85/secdev-docs", branch: "main", autoDeploy: false, webhookActive: false, lastSync: "Never" },
];

export default function GitHubPage() {
  const [connected] = useState(true);
  const [repos, setRepos] = useState(REPOS);

  const toggleAutoDeploy = (id: number) => {
    setRepos((prev) => prev.map((r) => r.id === id ? { ...r, autoDeploy: !r.autoDeploy } : r));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GitHub Integration</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">Connect your repositories and configure auto-deployments</p>
      </div>

      {/* Connection status */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-900 dark:bg-white flex items-center justify-center">
              <Github className="w-5 h-5 text-white dark:text-gray-900" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">GitHub Account</p>
              <p className="text-xs text-gray-500 dark:text-zinc-500">@deekshithgowda85</p>
            </div>
            {connected && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Connected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Sync repos
            </button>
            <button className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* Repositories */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Repositories</h2>
          <span className="text-xs text-gray-400 dark:text-zinc-500">{repos.length} repos</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {repos.map((repo) => (
            <div key={repo.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
              <Github className="w-4 h-4 text-gray-500 dark:text-zinc-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{repo.fullName}</p>
                  <a href={`https://github.com/${repo.fullName}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 dark:text-zinc-600 hover:text-indigo-500 transition-colors">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-zinc-500">
                  <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{repo.branch}</span>
                  <span>Synced {repo.lastSync}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {/* Webhook status */}
                <div className="hidden md:flex items-center gap-1.5 text-xs">
                  {repo.webhookActive ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><Zap className="w-3 h-3" />Webhook active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400 dark:text-zinc-600"><AlertCircle className="w-3 h-3" />No webhook</span>
                  )}
                </div>
                {/* Auto-deploy toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-zinc-500 hidden sm:block">Auto-deploy</span>
                  <button
                    onClick={() => toggleAutoDeploy(repo.id)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${repo.autoDeploy ? "bg-indigo-600" : "bg-gray-200 dark:bg-zinc-700"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${repo.autoDeploy ? "translate-x-4" : ""}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-600/20 rounded-xl p-4">
        <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium mb-1">How auto-deploy works</p>
        <p className="text-xs text-indigo-700 dark:text-indigo-400">
          When enabled, every push to the default branch will trigger a new SecDev deployment automatically via GitHub webhooks. Deployments run in isolated E2B sandboxes and results appear here in real time.
        </p>
      </div>
    </div>
  );
}
