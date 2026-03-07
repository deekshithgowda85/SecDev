"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Rocket, FolderGit2, Github, KeyRound, Terminal,
  TestTube2, Shield, Zap, BarChart3, Box, Settings, CreditCard, User,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
} from "lucide-react";

interface NavItem { label: string; href: string; icon: React.ElementType; }
interface NavGroup { title: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/console/dashboard", icon: LayoutDashboard },
      { label: "Deployments", href: "/console/deployments", icon: Rocket },
      { label: "Projects", href: "/console/projects", icon: FolderGit2 },
    ],
  },
  {
    title: "Integrations",
    items: [
      { label: "GitHub", href: "/console/github", icon: Github },
      { label: "Environment Vars", href: "/console/env", icon: KeyRound },
      { label: "Logs", href: "/console/logs", icon: Terminal },
    ],
  },
  {
    title: "Testing",
    items: [
      { label: "Test Suite", href: "/console/testing", icon: TestTube2 },
      { label: "Security Scans", href: "/console/security", icon: Shield },
      { label: "API Testing", href: "/console/api-testing", icon: Zap },
      { label: "Performance", href: "/console/performance", icon: BarChart3 },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      { label: "Sandbox Manager", href: "/console/sandboxes", icon: Box },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", href: "/console/settings", icon: Settings },
      { label: "Billing", href: "/console/billing", icon: CreditCard },
      { label: "Account", href: "/console/account", icon: User },
    ],
  },
];

export function ConsoleSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) =>
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));

  return (
    <aside
      className={`relative flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 transition-all duration-300 shrink-0 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-2.5 px-3 h-14 border-b border-gray-200 dark:border-zinc-800 shrink-0 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">SD</span>
        </div>
        {!collapsed && (
          <span className="text-gray-900 dark:text-white font-semibold text-sm">SecDev</span>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-1">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.title)}
                className="flex items-center justify-between w-full px-2 py-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-600 uppercase tracking-widest hover:text-gray-600 dark:hover:text-zinc-400 transition-colors"
              >
                {group.title}
                {collapsedGroups[group.title] ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronUp className="w-3 h-3" />
                )}
              </button>
            )}
            {!collapsedGroups[group.title] && (
              <div className="space-y-0.5 mt-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-600/15 dark:text-indigo-400 font-medium"
                          : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[4.5rem] w-6 h-6 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors z-10 shadow-sm"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
