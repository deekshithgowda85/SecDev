"use client";
import { useState } from "react";
import { getProjects } from "@/lib/mock-api";
import type { ProjectStatus } from "@/lib/mock-api";
import { Plus, ExternalLink, Trash2, Settings, CheckCircle2, Loader2, XCircle, GitBranch } from "lucide-react";

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusDot({ status }: { status: ProjectStatus }) {
  const map: Record<ProjectStatus, string> = {
    active:   "bg-green-500",
    building: "bg-yellow-500 animate-pulse",
    inactive: "bg-gray-400 dark:bg-zinc-600",
  };
  return <span className={`w-2 h-2 rounded-full ${map[status]}`} />;
}

export default function ProjectsPage() {
  const projects = getProjects();
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">{projects.length} projects connected</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* New project modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Project</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wide">Project Name</label>
                <input className="mt-1.5 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors" placeholder="my-awesome-app" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wide">GitHub Repository</label>
                <input className="mt-1.5 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors" placeholder="username/repo" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wide">Framework</label>
                <select className="mt-1.5 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors">
                  <option>Next.js</option>
                  <option>Node.js</option>
                  <option>Python / FastAPI</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNew(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowNew(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <div key={project.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <StatusDot status={project.status} />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{project.name}</h3>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-500 font-mono mb-3">{project.repo}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-500 mb-4">
              <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{project.branch}</span>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-gray-600 dark:text-zinc-400">{project.framework}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-500">
                {project.status === "active" && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                {project.status === "building" && <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />}
                {project.status === "inactive" && <XCircle className="w-3 h-3 text-gray-400" />}
                Last deployed {timeAgo(project.lastDeployment)}
              </div>
              {project.deploymentUrl !== "—" && (
                <a href={project.deploymentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  <ExternalLink className="w-3 h-3" /> Visit
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
