"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { 
  Github, 
  AlertCircle, 
  PackageOpen, 
  LayoutGrid, 
  List, 
  Search, 
  ArrowUpDown 
} from "lucide-react";
import { RepositoryCard, type GitHubRepo } from "./repository-card";
import { RepositoryTable } from "./repository-table";
import { useDebounce } from "@/lib/hooks/useDebounce"; // Hook created in Step 1

// ============================================================================
// SKELETON LOADERS
// ============================================================================

/**
 * Renders a grid-style skeleton card during initial data fetching.
 */
function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 animate-pulse shadow-sm">
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

/**
 * Renders a table-row skeleton during initial data fetching.
 */
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-gray-100 dark:border-zinc-800">
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-32 mb-1.5" />
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

// ============================================================================
// MAIN COMPONENT DEFINITION
// ============================================================================

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

export type SortOption = "updated" | "name" | "stars";

export function RepositoryList({
  limit,
  showViewToggle = true,
  defaultView = "table",
  compact = false,
}: RepositoryListProps) {
  // Authentication & Network State
  const { data: session, status } = useSession();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI & Interaction State
  const [view, setView] = useState<"grid" | "table">(defaultView);
  const [deployingId, setDeployingId] = useState<number | null>(null);
  const [deployMsg, setDeployMsg] = useState<{ id: number; ok: boolean; msg: string; url?: string } | null>(null);
  
  // Search & Filter State
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  
  // ISSUE #76: Custom Debounce Implementation (300ms delay)
  // This prevents the heavy array filtering from firing on every single keystroke.
  const debouncedSearch = useDebounce(search, 300);

  // ==========================================================================
  // DATA FETCHING EFFECT
  // ==========================================================================
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

  // ==========================================================================
  // ACTION HANDLERS
  // ==========================================================================
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
        const url = data.deployment?.publicUrl;
        setDeployMsg({
          id: repo.id,
          ok: true,
          msg: `Deployment started for ${repo.name}${url ? ` — ` : ""}`,
          url,
        });
      } else {
        setDeployMsg({ id: repo.id, ok: false, msg: data.error ?? "Deployment failed" });
      }
    } catch {
      setDeployMsg({ id: repo.id, ok: false, msg: "Network error during deploy" });
    } finally {
      setDeployingId(null);
      setTimeout(() => setDeployMsg(null), 8000); // Clear success/fail message after 8s
    }
  };

  // ==========================================================================
  // ISSUE #76: PERFORMANCE MEMOIZATION (SEARCH & SORT)
  // ==========================================================================
  
  // 1. Memoize the filtered array so it ONLY recalculates when the debounced string or raw repos change.
  const filteredRepos = useMemo(() => {
    if (!debouncedSearch) return repos;
    const lowerSearch = debouncedSearch.toLowerCase();
    
    return repos.filter((r) =>
      r.name.toLowerCase().includes(lowerSearch) ||
      (r.description?.toLowerCase() ?? "").includes(lowerSearch)
    );
  }, [repos, debouncedSearch]);

  // 2. Memoize the sorting engine to prevent re-sorting on unrelated state changes (like deploy toggles).
  const sortedRepos = useMemo(() => {
    return [...filteredRepos].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
        } else if (sortBy === "stars") {
          return ((b as any).stargazers_count ?? 0) - ((a as any).stargazers_count ?? 0);
      } else {
        // Default: Sort by Recently Updated
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
  }, [filteredRepos, sortBy]);

  // 3. Apply limits for dashboard views
  const displayed = limit ? sortedRepos.slice(0, limit) : sortedRepos;

  // ==========================================================================
  // RENDER: UNAUTHENTICATED STATE
  // ==========================================================================
  if (status === "unauthenticated" || (status === "authenticated" && !session?.accessToken)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
        <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4 ring-8 ring-gray-50/50 dark:ring-zinc-800/20">
          <Github className="w-8 h-8 text-gray-900 dark:text-white" />
        </div>
        <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Connect your GitHub account
        </p>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 max-w-sm leading-relaxed">
          Link your GitHub profile to instantly fetch your repositories, inspect codebases, and enable one-click environment deployments.
        <p className="text-xs text-gray-500 dark:text-zinc-500 mb-4 max-w-xs">
          Connect GitHub to access your repositories and deploy both public and private projects from your account.
        </p>
        <button
          type="button"
          onClick={() => signIn("github", { callbackUrl: "/console/github" })}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
        >
          Connect GitHub Integration
        </button>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: MAIN APPLICATION STATE
  // ==========================================================================
  return (
    <div className="space-y-4">
      {/* Dynamic Deployment Notification Banner */}
      {deployMsg && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border shadow-sm transition-all ${
            deployMsg.ok
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border ${deployMsg.ok
              ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"
            }`}
        >
          {deployMsg.msg}
          {deployMsg.url && (
            <a
              href={deployMsg.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto underline hover:opacity-80 decoration-2 underline-offset-2"
            >
              Open Live Preview
            </a>
          )}
        </div>
      )}

      {/* Control Panel: Search, Sort, and Layout Toggles */}
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          
          {/* Debounced Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search repositories by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 sm:ml-auto">
            {/* Memoized Sorting Dropdown */}
            <div className="relative flex items-center">
              <ArrowUpDown className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg pl-8 pr-8 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"

        <div className="flex items-center gap-3">
          <input
            type="text"
            aria-label="Search repositories"
            placeholder="Search repositories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-gray-500 dark:focus:border-zinc-400 transition-colors"
          />
          <span className="text-xs text-gray-500 dark:text-zinc-500 ml-auto">
            {loading ? "Loading…" : `${filtered.length} repos`}
          </span>
          {showViewToggle && (
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg">
              <button
                onClick={() => setView("table")}
                className={`p-1.5 rounded-md transition-colors ${view === "table"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                  }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded-md transition-colors ${view === "grid"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                  }`}
                title="Grid view"
              >
                <option value="updated">Recently Updated</option>
                <option value="name">Alphabetical</option>
                <option value="stars">Most Stars</option>
              </select>
            </div>

            <span className="hidden lg:inline-block text-xs font-medium text-gray-500 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md">
              {loading ? "Syncing..." : `${filteredRepos.length} Repositories`}
            </span>

            {/* Layout Toggles */}
            {showViewToggle && (
              <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                <button
                  onClick={() => setView("table")}
                  className={`p-1.5 rounded-md transition-all ${
                    view === "table"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-zinc-600"
                      : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-200/50 dark:hover:bg-zinc-700/50"
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("grid")}
                  className={`p-1.5 rounded-md transition-all ${
                    view === "grid"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-zinc-600"
                      : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-200/50 dark:hover:bg-zinc-700/50"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Network Error State */}
      {error && !loading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm font-medium text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" /> 
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={`repo-skeleton-card-${i}`} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800">
                  {["Repository", "Visibility", "Language", "Updated", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={`repo-skeleton-row-${i}`} />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Empty State (No Repos or Search Miss) */}
      {!loading && !error && displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-zinc-900 border border-dashed border-gray-300 dark:border-zinc-700 rounded-xl">
          <div className="w-14 h-14 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 ring-8 ring-gray-50/50 dark:ring-zinc-800/20">
            <PackageOpen className="w-6 h-6 text-gray-400 dark:text-zinc-500" />
          </div>
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            {search ? "No repositories match your search" : "No repositories found"}
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm">
            {search 
              ? `We couldn't find anything matching "${search}". Try adjusting your filters.` 
              : "Create a new repository on your GitHub account to get started with deployments."}
          </p>
        </div>
      )}

      {/* Render: Grid View Layout */}
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

      {/* Render: Table View Layout */}
      {!loading && !error && displayed.length > 0 && view === "table" && (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <RepositoryTable
            repos={displayed}
            onDeploy={handleDeploy}
            deployingId={deployingId}
          />
        </div>
      )}
    </div>
  );
}