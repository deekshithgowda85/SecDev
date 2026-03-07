"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Bell, Search, ChevronDown, LogOut, User, Settings, Sun, Moon, CheckCircle2 } from "lucide-react";
import { useTheme } from "next-themes";

const PROJECTS = ["SecDev API", "SecDev UI", "SecDev Worker"];

export function ConsoleTopNav() {
  const [selectedProject, setSelectedProject] = useState("SecDev API");
  const [projectOpen, setProjectOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  React.useEffect(() => setMounted(true), []);

  const close = () => { setProjectOpen(false); setUserOpen(false); };

  return (
    <header className="flex items-center h-14 px-4 border-b border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm gap-3 shrink-0">
      {/* Project selector */}
      <div className="relative">
        <button
          onClick={() => { setProjectOpen(!projectOpen); setUserOpen(false); }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-sm text-gray-800 dark:text-white transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <span>{selectedProject}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
        </button>
        {projectOpen && (
          <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 py-1">
            {PROJECTS.map((p) => (
              <button
                key={p}
                onClick={() => { setSelectedProject(p); close(); }}
                className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {p}
                {p === selectedProject && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
              </button>
            ))}
            <div className="border-t border-gray-200 dark:border-zinc-700 mt-1 pt-1">
              <Link
                href="/console/projects"
                onClick={close}
                className="block w-full px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-zinc-700 text-left transition-colors"
              >
                + New Project
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-800 dark:text-zinc-300 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Status pill */}
      <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-xs text-gray-500 dark:text-zinc-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        All systems operational
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>

        {/* User menu */}
        <div className="relative ml-1">
          <button
            onClick={() => { setUserOpen(!userOpen); setProjectOpen(false); }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white font-semibold shrink-0">
              D
            </div>
            <span className="text-sm text-gray-700 dark:text-zinc-300 hidden sm:block">deekshith</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
          </button>
          {userOpen && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 py-1">
              <div className="px-4 py-2.5 border-b border-gray-200 dark:border-zinc-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">deekshith</p>
                <p className="text-xs text-gray-500 dark:text-zinc-500">deekshith@secdev.app</p>
              </div>
              <Link href="/console/account" onClick={close} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white transition-colors">
                <User className="w-4 h-4" />Account
              </Link>
              <Link href="/console/settings" onClick={close} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white transition-colors">
                <Settings className="w-4 h-4" />Settings
              </Link>
              <div className="border-t border-gray-200 dark:border-zinc-700 mt-1 pt-1">
                <Link href="/" onClick={close} className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <LogOut className="w-4 h-4" />Sign Out
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
