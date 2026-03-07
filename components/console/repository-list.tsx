"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Github, AlertCircle, PackageOpen, LayoutGrid, List } from "lucide-react";
import { RepositoryCard, type GitHubRepo } from "./repository-card";
import { RepositoryTable } from "./repository-table";

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-32" />
        <div className="h-5 bg-gray-200 dark:bg-zinc-700 rounded-full w-16" />
      </div>
      <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded w-48 mb-4" />
      <div className="flex gap-2">
        <div className="h-7 bg-gray-200 dark:bg-zinc-700 rounded-lg w-20" />
        <div className="h-7 bg-gray-100 dark:bg-zinc-800 rounded-lg w-24" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-gray-100 dark:border-zinc-800">
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-32 mb-1" />
        <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded w-48" />
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="h-5 bg-gray-200 dark:bg-zinc-700 rounded-full w-16" />
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-20" />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-16" />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <div className="h-7 bg-gray-200 dark:bg-zinc-700 rounded-lg w-20" />
          <div className="h-7 bg-gray-100 dark:bg-zinc-800 rounded-lg w-8" />
        </div>
      </td>
    </tr>
  );
}

interface RepositoryListProps {
  /** Limit how many repos to display. Defaults to all. */
  limit?: number;
  /** Show view-toggle (grid/table). Defaults true. */
  showViewToggle?: boolean;
  /** Initial view layout. */
  defaultView?: "grid" | "table";
  /** Compact mode hides header controls, for embedding in dashboard. */
  compact?: boolean;
}

export function RepositoryList({
  limit,
  showViewToggle = true,
  defaultView = "table",
  compact = false,
}: RepositoryListProps) {
  const { data: session, status } = useSession();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "table">(defaultView);
  const [deployingId, setDeployingId] = useState<number | null>(null);
  const [deployMsg, setDeployMsg] = useState<{ id: number; ok: boolean; msg: string } | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) return;

    setLoading(true);
    setError(null);

    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRepos(data);
        } else {
          setError(data?.error ?? "Failed to load repositories");
        }
      })
      .catch(() => setError("Network error — could not reach GitHub API"))
      .finally(() => setLoading(false));
  }, [status, session?.accessToken]);

  const handleDeploy = async (repo: GitHubRepo) => {
    setDeployingId(repo.id);
    setDeployMsg(null);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_name: repo.name,
          repo_url: repo.clone_url,
          branch: repo.default_branch,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDeployMsg({ id: repo.id, ok: true, msg: `Deployment started for ${repo.name}` });
      } else {
        setDeployMsg({ id: repo.id, ok: false, msg: data.error ?? "Deployment failed" });
      }
    } catch {
      setDeployMsg({ id: repo.id, ok: false, msg: "Network error during deploy" });
    } finally {
      setDeployingId(null);
      setTimeout(() => setDeployMsg(null), 4000);
    }
  };

  // Not signed in with GitHub
  if (status === "unauthenticated" || (status === "authenticated" && !session?.accessToken)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
        <Github className="w-10 h-10 text-gray-300 dark:text-zinc-600 mb-3" />
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          Connect your GitHub account
        </p>
        <p className="text-xs text-gray-500 dark:text-zinc-500 mb-4 max-w-xs">
          Sign in with GitHub to fetch your repositories and enable one-click deployments.
        </p>
        <a
          href="/login"
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors"
        >
          Sign in with GitHub
        </a>
      </div>
    );
  }

  const filtered = repos.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description?.toLowerCase() ?? "").includes(search.toLowerCase())
  );
  const displayed = limit ? filtered.slice(0, limit) : filtered;

  return (
    <div className="space-y-4">
      {/* Deploy notification */}
      {deployMsg && (
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border ${
            deployMsg.ok
              ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"
          }`}
        >
          {deployMsg.msg}
        </div>
      )}

      {/* Controls */}
      {!compact && (
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search repositories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
          />
          <span className="text-xs text-gray-500 dark:text-zinc-500 ml-auto">
            {loading ? "Loading…" : `${filtered.length} repos`}
          </span>
          {showViewToggle && (
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg">
              <button
                onClick={() => setView("table")}
                className={`p-1.5 rounded-md transition-colors ${
                  view === "table"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded-md transition-colors ${
                  view === "grid"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800">
                  {["Repository", "Visibility", "Language", "Updated", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Empty state */}
      {!loading && !error && displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
          <PackageOpen className="w-10 h-10 text-gray-300 dark:text-zinc-600 mb-3" />
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No repositories found</p>
          <p className="text-xs text-gray-500 dark:text-zinc-500">
            {search ? "Try a different search term." : "Create a repository on GitHub to get started."}
          </p>
        </div>
      )}

      {/* Grid view */}
      {!loading && !error && displayed.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((repo) => (
            <RepositoryCard
              key={repo.id}
              repo={repo}
              onDeploy={handleDeploy}
              deploying={deployingId === repo.id}
            />
          ))}
        </div>
      )}

      {/* Table view */}
      {!loading && !error && displayed.length > 0 && view === "table" && (
        <RepositoryTable
          repos={displayed}
          onDeploy={handleDeploy}
          deployingId={deployingId}
        />
      )}
    </div>
  );
}
