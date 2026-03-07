"use client";
import { ConsoleSidebar } from "@/components/console/sidebar";
import { ConsoleTopNav } from "@/components/console/top-navbar";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-zinc-950 overflow-hidden">
      <ConsoleSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <ConsoleTopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
