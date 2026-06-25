"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { 
  Github, 
  AlertCircle, 
  PackageOpen, 
  LayoutGrid, 
  List, 
  Search, 
  ArrowUpDown,
  UploadCloud,
  FileCode,
  Trash2,
  CheckCircle2
} from "lucide-react";
import { RepositoryCard, type GitHubRepo } from "./repository-card";
import { RepositoryTable } from "./repository-table";
import { useDebounce } from "@/lib/hooks/useDebounce";

// ============================================================================
// TYPE DEFINITIONS & INTERFACES
// ============================================================================

/**
 * Represents a file that has been successfully validated and staged
 * in the Drag-and-Drop zone, ready for payload injection.
 */
export interface InjectedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  buffer: ArrayBuffer;
}

export type SortOption = "updated" | "name" | "stars";

interface RepositoryListProps {
  limit?: number;
  showViewToggle?: boolean;
  defaultView?: "grid" | "table";
  compact?: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats raw byte sizes into human-readable strings (KB, MB).
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ============================================================================
// SUB-COMPONENTS (Decoupled for clean render cycles)
// ============================================================================

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 animate-pulse shadow-sm">
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
      ))}
    </div>
  );
}

function SkeletonTable() {
  return (
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
            <tr key={i} className="animate-pulse border-b border-gray-100 dark:border-zinc-800">
              <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-32 mb-1.5" />
                <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded w-48" />
              </td>
              <td className="px-4 py-3 hidden sm:table-cell"><div className="h-5 bg-gray-200 dark:bg-zinc-700 rounded-full w-16" /></td>
              <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-20" /></td>
              <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-16" /></td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <div className="h-7 bg-gray-200 dark:bg-zinc-700 rounded-lg w-20" />
                  <div className="h-7 bg-gray-100 dark:bg-zinc-800 rounded-lg w-8" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
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
  );
}

// ============================================================================
// MAIN COMPONENT EXPORT
// ============================================================================

export function RepositoryList({ 
  limit, 
  showViewToggle = true, 
  defaultView = "table", 
  compact = false 
}: RepositoryListProps) {
  
  // Auth & API States
  const { data: session, status } = useSession();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI Controls
  const [view, setView] = useState<"grid" | "table">(defaultView);
  const [deployingId, setDeployingId] = useState<number | null>(null);
  const [deployMsg, setDeployMsg] = useState<{ id: number; ok: boolean; msg: string; url?: string } | null>(null);
  
  // Filter & Sort Maps
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const debouncedSearch = useDebounce(search, 300);

  // Drag & Drop Injection States
  const [isDragActive, setIsDragActive] = useState(false);
  const [injectedFiles, setInjectedFiles] = useState<InjectedFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // NETWORK INITIATION HOOK
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) return;
    
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data)) {
          setRepos(data);
        } else {
          setError(data?.error ?? "Failed to load remote repositories. Check GitHub connection.");
        }
      })
      .catch(() => {
        if (isMounted) setError("Network exception — could not resolve GitHub API endpoint.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [status, session?.accessToken]);

  // --------------------------------------------------------------------------
  // DEPLOYMENT PIPELINE
  // --------------------------------------------------------------------------
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
          injected_files: injectedFiles.map(f => ({ name: f.name, size: f.size })) 
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDeployMsg({ 
          id: repo.id, 
          ok: true, 
          msg: `Pipeline initialized for ${repo.name}`, 
          url: data.deployment?.publicUrl 
        });
        setInjectedFiles([]); // Clear staged files on successful dispatch
      } else {
        setDeployMsg({ id: repo.id, ok: false, msg: data.error ?? "Pipeline execution failed." });
      }
    } catch {
      setDeployMsg({ id: repo.id, ok: false, msg: "Network error during deployment handshake." });
    } finally {
      setDeployingId(null);
      setTimeout(() => setDeployMsg(null), 8000);
    }
  };

  // --------------------------------------------------------------------------
  // NATIVE DRAG AND DROP HANDLERS
  // --------------------------------------------------------------------------
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLElement> | React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    setFileError(null);

    const files = Array.from(
      ('dataTransfer' in e && e.dataTransfer ? e.dataTransfer.files : null) || 
      ('target' in e && e.target ? (e.target as HTMLInputElement).files : null) || 
      []
    ) as File[];
    const validFiles: File[] = [];

    // Validation Checkpoint
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) {
        setFileError(`Security constraint: "${file.name}" exceeds the 2MB memory limit.`);
        return;
      }
      validFiles.push(file);
    }

    // Process files asynchronously using FileReader bounds
    const processedFiles = await Promise.all(
      validFiles.map((file) => {
        return new Promise<InjectedFile>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              id: crypto.randomUUID(),
              name: file.name,
              size: file.size,
              type: file.type || "unknown",
              buffer: event.target?.result as ArrayBuffer,
            });
          };
          reader.onerror = () => reject(new Error("File stream processing failure"));
          reader.readAsArrayBuffer(file);
        });
      })
    );

    // Merge new files while preventing duplicate names
    setInjectedFiles((prev) => {
      const existingNames = new Set(prev.map(f => f.name));
      const filteredNew = processedFiles.filter(f => !existingNames.has(f.name));
      return [...prev, ...filteredNew];
    });
  }, []);

  const removeFile = (id: string) => {
    setInjectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // --------------------------------------------------------------------------
  // MEMOIZED SORT & FILTER ENGINES
  // --------------------------------------------------------------------------
  const filteredRepos = useMemo(() => {
    if (!debouncedSearch) return repos;
    const lowerSearch = debouncedSearch.toLowerCase();
    return repos.filter((r) => 
      r.name.toLowerCase().includes(lowerSearch) || 
      (r.description?.toLowerCase() ?? "").includes(lowerSearch)
    );
  }, [repos, debouncedSearch]);

  const sortedRepos = useMemo(() => {
    return [...filteredRepos].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "stars") return (b.stars ?? 0) - (a.stars ?? 0);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [filteredRepos, sortBy]);

  const displayed = limit ? sortedRepos.slice(0, limit) : sortedRepos;

  // --------------------------------------------------------------------------
  // UNAUTHENTICATED RENDER BLOCK
  // --------------------------------------------------------------------------
  if (status === "unauthenticated" || (status === "authenticated" && !session?.accessToken)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
        <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4 ring-8 ring-gray-50/50 dark:ring-zinc-800/20">
          <Github className="w-8 h-8 text-gray-900 dark:text-white" />
        </div>
        <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">Connect your GitHub Identity</p>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 max-w-sm">
          Link your GitHub profile to fetch repositories, analyze codebases, and enable one-click deployments.
        </p>
        <button
          type="button"
          onClick={() => signIn("github", { callbackUrl: "/console/github" })}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
        >
          Authorize GitHub App
        </button>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // MAIN DASHBOARD RENDER
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      
      {/* FILE INJECTION DROPZONE UI */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm transition-all duration-300">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-500" />
            Static File Injection
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Drag and drop `.env` files, configuration assets, or build scripts to inject them directly into your deployment sandbox.
          </p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 flex flex-col items-center justify-center min-h-[140px] ${
            isDragActive 
              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 dark:border-indigo-400 scale-[1.01]" 
              : "border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
          }`}
        >
          <UploadCloud className={`w-10 h-10 mb-3 transition-colors ${isDragActive ? "text-indigo-500" : "text-gray-400 dark:text-zinc-500"}`} />
          <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
            {isDragActive ? "Release to stage files..." : "Drag & drop files here"}
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">or click anywhere in this box to browse</p>
          
          <input 
            type="file" 
            multiple 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleDrop}
          />
        </div>

        {fileError && (
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg border border-red-100 dark:border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {fileError}
          </div>
        )}

        {injectedFiles.length > 0 && (
          <div className="mt-5 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">
                Staged Payload ({injectedFiles.length})
              </p>
              <button 
                onClick={() => setInjectedFiles([])} 
                className="text-[10px] font-medium text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {injectedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 group">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="bg-white dark:bg-zinc-700 p-1.5 rounded-md shadow-sm border border-gray-100 dark:border-zinc-600">
                      <FileCode className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{file.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Control Navigation Header */}
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500"
            />
          </div>
          <div className="flex items-center gap-3 sm:ml-auto">
            <div className="relative flex items-center">
              <ArrowUpDown className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="appearance-none bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg pl-8 pr-8 py-2 text-sm font-medium outline-none cursor-pointer dark:text-white focus:ring-2 focus:ring-indigo-500/20">
                <option value="updated">Recently Updated</option>
                <option value="name">Alphabetical</option>
                <option value="stars">Most Stars</option>
              </select>
            </div>
            {showViewToggle && (
              <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                <button onClick={() => setView("table")} className={`p-1.5 rounded-md transition-all ${view === "table" ? "bg-white dark:bg-zinc-700 shadow-sm ring-1 ring-gray-200 dark:ring-zinc-600" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}><List className="w-4 h-4" /></button>
                <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-all ${view === "grid" ? "bg-white dark:bg-zinc-700 shadow-sm ring-1 ring-gray-200 dark:ring-zinc-600" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}><LayoutGrid className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deployment Banner */}
      {deployMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border shadow-sm transition-all ${deployMsg.ok ? "bg-green-50 dark:bg-green-500/10 border-green-200 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-500/10 border-red-200 text-red-700 dark:text-red-400"}`}>
          {deployMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {deployMsg.msg}
          {deployMsg.url && <a href={deployMsg.url} target="_blank" rel="noopener noreferrer" className="ml-auto underline hover:opacity-80 decoration-2 underline-offset-2">View Live Target</a>}
        </div>
      )}

      {/* Control Navigation Header */}
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500"
            />
          </div>
          <div className="flex items-center gap-3 sm:ml-auto">
            <div className="relative flex items-center">
              <ArrowUpDown className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="appearance-none bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg pl-8 pr-8 py-2 text-sm font-medium outline-none cursor-pointer dark:text-white focus:ring-2 focus:ring-indigo-500/20">
                <option value="updated">Recently Updated</option>
                <option value="name">Alphabetical</option>
                <option value="stars">Most Stars</option>
              </select>
            </div>
            {showViewToggle && (
              <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                <button onClick={() => setView("table")} className={`p-1.5 rounded-md transition-all ${view === "table" ? "bg-white dark:bg-zinc-700 shadow-sm ring-1 ring-gray-200 dark:ring-zinc-600" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}><List className="w-4 h-4" /></button>
                <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-all ${view === "grid" ? "bg-white dark:bg-zinc-700 shadow-sm ring-1 ring-gray-200 dark:ring-zinc-600" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}><LayoutGrid className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Render Tree */}
      {error && !loading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        view === "grid" ? <SkeletonGrid /> : <SkeletonTable />
      ) : (
        displayed.length === 0 && !error ? (
          <EmptyState search={search} />
        ) : (
          view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayed.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} onDeploy={handleDeploy} deploying={deployingId === repo.id} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <RepositoryTable repos={displayed} onDeploy={handleDeploy} deployingId={deployingId} />
            </div>
          )
        )
      )}
    </div>
  );
}