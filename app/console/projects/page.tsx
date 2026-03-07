"use client";
import { RepositoryList } from "@/components/console/repository-list";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">
            Your GitHub repositories — each repo is a deployable project
          </p>
        </div>
        <Link
          href="https://github.com/new"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Project
        </Link>
      </div>
      <RepositoryList showViewToggle defaultView="grid" />
    </div>
  );
}
