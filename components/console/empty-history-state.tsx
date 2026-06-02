"use client";

import { History, LucideIcon, ArrowRight } from "lucide-react";
import Link from "next/link";

interface EmptyHistoryStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyHistoryState({
  title = "No execution history found",
  description = "You haven't triggered any monitoring or analysis pipelines on this workspace yet.",
  icon: Icon = History,
  actionLabel = "Run your first scan",
  actionHref
}: EmptyHistoryStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 min-h-[320px] bg-white dark:bg-zinc-900 border border-dashed border-gray-200 dark:border-zinc-800 rounded-xl transition-all shadow-sm">
      
      {/* Decorative Icon Graphic Badge */}
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-400 dark:bg-zinc-800/50 dark:text-zinc-500 mb-4 ring-8 ring-gray-50/50 dark:ring-zinc-800/20">
        <Icon className="w-6 h-6" />
      </div>

      {/* Typography Copy Sections */}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
        {title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm leading-relaxed mb-5">
        {description}
      </p>

      {/* Conditional Quick-Action CTA Affordance */}
      {actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-lg shadow-sm transition-colors group"
        >
          {actionLabel}
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}