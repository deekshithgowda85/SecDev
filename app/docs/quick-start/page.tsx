import Link from "next/link";
import { ArrowRight, GitBranch, Rocket, Database, Terminal } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: GitBranch,
    title: "Connect your GitHub",
    description: "Sign in with GitHub and grant SecDev access to your repositories. Public and private repos are both supported.",
    action: { label: "Go to GitHub integration", href: "/console/github" },
  },
  {
    step: "02",
    icon: Database,
    title: "Provision a Neon database",
    description: "Optionally link a Neon PostgreSQL database. Each deployment gets an isolated database branch — no shared state, no conflicts.",
    action: { label: "Set up Neon", href: "/console/neon" },
  },
  {
    step: "03",
    icon: Rocket,
    title: "Deploy your project",
    description: "Pick a repository, choose a branch, and hit Deploy. SecDev spins up an E2B sandbox, installs dependencies, and runs your app.",
    action: { label: "Open console", href: "/console/dashboard" },
  },
  {
    step: "04",
    icon: Terminal,
    title: "Monitor & iterate",
    description: "Stream live logs, view test results, and check security scan reports. Push a new commit and SecDev redeploys automatically.",
    action: { label: "View logs", href: "/console/logs" },
  },
];

export default function QuickStartPage() {
  return (
    <div>
      <div className="mb-8 pb-6 border-b border-gray-200 dark:border-zinc-800">
        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">Getting Started</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Quick Start</h1>
        <p className="text-base text-gray-500 dark:text-zinc-400">
          Get your first project deployed in an isolated sandbox in under 5 minutes.
        </p>
      </div>

      <div className="space-y-6">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex gap-5 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gray-900 dark:bg-white flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white dark:text-gray-900" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-600">{s.step}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mb-3 leading-relaxed">{s.description}</p>
                <Link
                  href={s.action.href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors"
                >
                  {s.action.label} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 p-5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Need help?</p>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Browse the full documentation in the sidebar, or{" "}
          <Link href="/about" className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-white transition-colors">contact us</Link>.
        </p>
      </div>
    </div>
  );
}
