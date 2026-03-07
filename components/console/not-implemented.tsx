import { Construction } from "lucide-react";
import Link from "next/link";

interface NotImplementedProps {
  title?: string;
  description?: string;
  /** Optional call-to-action link */
  cta?: { label: string; href: string };
}

export function NotImplemented({
  title = "Not Implemented",
  description = "This section is a UI placeholder. Backend integration is required before real data appears here.",
  cta,
}: NotImplementedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center mb-5">
        <Construction className="w-7 h-7 text-amber-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm mb-1">{description}</p>
      <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-full px-3 py-1 mt-3">
        Hardcoded / mock data removed
      </p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-5 px-4 py-2 text-sm font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
