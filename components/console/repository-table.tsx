import { Lock, Unlock, ExternalLink, Rocket, GitFork } from "lucide-react";
import type { GitHubRepo } from "./repository-card";
import { timeAgo } from "./repository-card";

interface RepositoryTableProps {
  repos: GitHubRepo[];
  onDeploy: (repo: GitHubRepo) => void;
  deployingId?: number | null;
}

export function RepositoryTable({ repos, onDeploy, deployingId }: RepositoryTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
              Repository
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide hidden sm:table-cell">
              Visibility
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide hidden md:table-cell">
              Language
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide hidden lg:table-cell">
              Updated
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
          {repos.map((repo) => {
            const isDeploying = deployingId === repo.id;
            return (
              <tr
                key={repo.id}
                className="bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                {/* Repo name + description */}
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
                    {repo.name}
                  </p>
                  {repo.description && (
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 truncate max-w-xs">
                      {repo.description}
                    </p>
                  )}
                </td>

                {/* Visibility */}
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${
                      repo.private
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                        : "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                    }`}
                  >
                    {repo.private ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {repo.private ? "Private" : "Public"}
                  </span>
                </td>

                {/* Language */}
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-400 hidden md:table-cell">
                  {repo.language ?? "—"}
                </td>

                {/* Updated */}
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-400 hidden lg:table-cell whitespace-nowrap">
                  {timeAgo(repo.updated_at)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onDeploy(repo)}
                      disabled={isDeploying}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <Rocket className="w-3 h-3" />
                      {isDeploying ? "Deploying…" : "Deploy"}
                    </button>
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
                      title="Open on GitHub"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
