"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Search, ChevronDown, LogOut, User, Settings, Sun, Moon, Github, Rocket } from "lucide-react";
import { useTheme } from "next-themes";
import { useSession, signIn, signOut } from "next-auth/react";

export function ConsoleTopNav() {
  const [userOpen, setUserOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications?unread=1")
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.ok) setUnreadCount(d.unreadCount ?? 0); })
      .catch(() => null);
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => setMounted(true), []);

  const close = () => { setUserOpen(false); };

  // Derive display name and avatar initial from session
  const displayName = session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "User";
  const avatarInitial = displayName[0]?.toUpperCase() ?? "U";
  const avatarImage = session?.user?.image;

  return (
    <header className="flex items-center h-14 px-4 border-b border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm gap-3 shrink-0">
      {/* Quick nav */}
      <Link
        href="/console/deployments"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-sm text-gray-800 dark:text-white transition-colors"
      >
        <Rocket className="w-3.5 h-3.5" />
        <span>Deployments</span>
      </Link>

      {/* Search */}
      <div className="flex-1 max-w-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-800 dark:text-zinc-300 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-gray-500 dark:focus:border-zinc-400 transition-colors"
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
        <Link
          href="/console/notifications"
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        <div className="relative ml-1">
          <button
            onClick={() => { setUserOpen(!userOpen); }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {avatarImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarImage} alt={displayName} className="w-6 h-6 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-xs text-white dark:text-gray-900 font-semibold shrink-0">
                {avatarInitial}
              </div>
            )}
            <span className="text-sm text-gray-700 dark:text-zinc-300 hidden sm:block">{displayName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
          </button>
          {userOpen && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 py-1">
              <div className="px-4 py-2.5 border-b border-gray-200 dark:border-zinc-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-500 truncate">{session?.user?.email ?? "GitHub user"}</p>
              </div>
              <Link href="/console/account" onClick={close} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white transition-colors">
                <User className="w-4 h-4" />Account
              </Link>
              <Link href="/console/settings" onClick={close} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white transition-colors">
                <Settings className="w-4 h-4" />Settings
              </Link>
              {!session && (
                <button
                  onClick={() => { signIn("github", { callbackUrl: "/console/dashboard" }); close(); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Github className="w-4 h-4" />Sign in with GitHub
                </button>
              )}
              <div className="border-t border-gray-200 dark:border-zinc-700 mt-1 pt-1">
                <button
                  onClick={() => { signOut({ callbackUrl: "/" }); close(); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
