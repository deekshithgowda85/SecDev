import Link from "next/link";
import { GitBranch, Rocket, Database, Terminal } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: GitBranch,
    title: "Connect your GitHub",
    description: "Sign in with GitHub and grant SecDev access to your repositories. Public and private repos are both supported.",
    detail: "Navigate to Console → Settings → GitHub Integration. Click 'Connect GitHub' and authorize the OAuth app. You can grant access to all repositories or select specific ones. Fine-grained personal access tokens are supported for private repository access.",
  },
  {
    step: "02",
    icon: Database,
    title: "Provision a Neon database",
    description: "Optionally link a Neon PostgreSQL database. Each deployment gets an isolated database branch — no shared state, no conflicts.",
    detail: "In Console → Settings → Database, click 'Add Neon Database' and paste your Neon connection string, or create a new project via the Neon dashboard. SecDev automatically branches your database for each deployment so every environment gets its own isolated schema — changes in one branch never affect another.",
  },
  {
    step: "03",
    icon: Rocket,
    title: "Deploy your project",
    description: "Pick a repository, choose a branch, and hit Deploy. SecDev spins up an E2B sandbox, installs dependencies, and runs your app.",
    detail: "Open the Console Dashboard and click 'New Deployment'. Paste your repository URL, select the target branch, and optionally add environment variables. SecDev auto-detects your framework (Next.js, React, Node.js, etc.), installs dependencies inside a Firecracker microVM sandbox, builds your project, and exposes it on a public preview URL — all within minutes.",
  },
  {
    step: "04",
    icon: Terminal,
    title: "Monitor & iterate",
    description: "Stream live logs, view test results, and security scan reports. Push a new commit and SecDev redeploys automatically.",
    detail: "Build logs stream in real time inside the Deployments panel. Once the build completes, Inngest automatically triggers the full test pipeline — HTTP health checks on every route, OWASP security scans, and performance load tests. Results appear in the Testing tab broken down by category. To redeploy, push a new commit to the same branch and trigger a new deployment from the console.",
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
                <p className="text-xs text-gray-400 dark:text-zinc-500 leading-relaxed border-l-2 border-gray-200 dark:border-zinc-700 pl-3">{s.detail}</p>
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
