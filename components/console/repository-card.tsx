import { Lock, Unlock, ExternalLink, Rocket, GitFork } from "lucide-react";

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  html_url: string;
  updated_at: string;
  pushed_at: string;
  language: string | null;
  stars: number;
  forks: number;
  default_branch: string;
  clone_url: string;
}

export function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-400",
  Python: "bg-green-500",
  Go: "bg-cyan-500",
  Rust: "bg-orange-600",
  Java: "bg-red-500",
  "C#": "bg-indigo-500",
  Ruby: "bg-red-400",
  Swift: "bg-orange-400",
  Kotlin: "bg-purple-500",
  Shell: "bg-gray-500",
  CSS: "bg-pink-500",
  HTML: "bg-orange-500",
};

interface RepositoryCardProps {
  repo: GitHubRepo;
  onDeploy: (repo: GitHubRepo) => void;
  deploying?: boolean;
}

export function RepositoryCard({ repo, onDeploy, deploying }: RepositoryCardProps) {
  const langColor = repo.language ? (LANG_COLORS[repo.language] ?? "bg-gray-400") : null;

  return (
    <div className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 hover:border-gray-400 dark:hover:border-zinc-600 hover:shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{repo.name}</h3>
          {repo.description && (
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{repo.description}</p>
          )}
        </div>
        <span
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${
            repo.private
              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
              : "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
          }`}
        >
          {repo.private ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          {repo.private ? "Private" : "Public"}
        </span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-zinc-500 mb-4 mt-3">
        {langColor && repo.language && (
          <span className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${langColor}`} />
            <span className="text-gray-600 dark:text-zinc-400">{repo.language}</span>
          </span>
        )}
        <span title={`${repo.stars} stars`}>★ {repo.stars}</span>
        <span className="flex items-center gap-0.5" title={`${repo.forks} forks`}>
          <GitFork className="w-3 h-3" /> {repo.forks}
        </span>
        <span className="ml-auto text-gray-400 dark:text-zinc-500">
          Updated {timeAgo(repo.updated_at)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDeploy(repo)}
          disabled={deploying}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 active:bg-gray-800 dark:active:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Rocket className="w-3.5 h-3.5" />
          {deploying ? "Deploying…" : "Deploy"}
        </button>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View Repo
        </a>
      </div>
    </div>
  );
}
