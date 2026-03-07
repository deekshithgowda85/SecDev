"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Book, Rocket, ChevronDown, ChevronRight,
  Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const docSections = [
  {
    title: "Getting Started",
    items: [
      { label: "Introduction", href: "/docs", icon: Book },
      { label: "Quick Start", href: "/docs/quick-start", icon: Rocket },
    ],
  },
];

function DocsSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (t: string) => setCollapsed((p) => ({ ...p, [t]: !p[t] }));

  return (
    <nav className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-gray-200 dark:border-zinc-800">
        <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Documentation</p>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {docSections.map((section) => (
          <div key={section.title} className="mb-2">
            <button
              onClick={() => toggle(section.title)}
              className="flex items-center justify-between w-full px-2 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
            >
              {section.title}
              {collapsed[section.title] ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {!collapsed[section.title] && (
              <div className="space-y-0.5 mt-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-medium"
                          : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-16 h-[calc(100vh-4rem)] overflow-hidden">
        <DocsSidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
              <span className="font-semibold text-sm text-gray-900 dark:text-white">Docs</span>
              <button onClick={() => setMobileOpen(false)} className="text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <DocsSidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-16 z-30 flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
          >
            <Menu className="w-4 h-4" />
            Menu
          </button>
        </div>
        <div className="max-w-3xl mx-auto px-6 py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
