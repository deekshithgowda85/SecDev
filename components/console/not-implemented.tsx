"use client";
import { Construction, ArrowRight, Rocket, Github, BookOpen } from "lucide-react";
import Link from "next/link";

interface NotImplementedProps {
  title?: string;
  description?: string;
  /** Optional call-to-action link */
  cta?: { label: string; href: string };
  /** List of suggestions for what the user can do next */
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  "Check the sidebar for other available sections",
  "Deploy a repository to get started",
  "Refer to the documentation for feature availability",
];

export function NotImplemented({
  title = "Coming Soon",
  description = "This feature is under active development. Check back soon — or explore other parts of the console in the meantime.",
  cta,
  suggestions,
}: NotImplementedProps) {
  const items = suggestions ?? DEFAULT_SUGGESTIONS;
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center mb-5">
        <Construction className="w-7 h-7 text-amber-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-md mb-6">{description}</p>

      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        {cta && (
          <Link
            href={cta.href}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 rounded-lg transition-colors"
          >
            {cta.label} <ArrowRight className="w-4 h-4" />
          </Link>
        )}

        {items.length > 0 && (
          <>
            <div className="w-full border-t border-gray-100 dark:border-zinc-800 my-2" />

            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">
              In the meantime, you can:
            </p>
            <ul className="space-y-2 w-full">
              {items.map((item, i) => (
                <li
                  key={`not-implemented-suggestion-${item}`}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800/50 rounded-lg px-4 py-2 border border-gray-100 dark:border-zinc-800"
                >
                  {i === 0 ? <Rocket className="w-4 h-4 text-gray-400 shrink-0" /> :
                   i === 1 ? <Github className="w-4 h-4 text-gray-400 shrink-0" /> :
                   <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />}
                  {item}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}