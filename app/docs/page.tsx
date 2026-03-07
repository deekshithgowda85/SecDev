import Link from "next/link";
import { ArrowRight, GitBranch, Terminal, Zap, Shield, Lock, BarChart3, Database, Rocket, TestTube2 } from "lucide-react";

const features = [
  {
    icon: Rocket,
    title: "Quick Start",
    description: "Get from zero to your first deployed sandbox in under 5 minutes. Walk through connecting GitHub, configuring your stack, and deploying.",
    href: "/docs/quick-start",
    tag: "Getting Started",
  },
  {
    icon: GitBranch,
    title: "GitHub Integration",
    description: "Connect any public or private GitHub repository in seconds. SecDev automatically detects your stack and sets up the environment.",
    href: "/docs/quick-start",
    tag: "Integration",
  },
  {
    icon: Database,
    title: "Neon PostgreSQL",
    description: "Serverless Postgres powered by Neon. Branch your database alongside your code — instant, isolated DB environments per deployment.",
    href: "/docs/quick-start",
    tag: "Integration",
  },
  {
    icon: Terminal,
    title: "E2B Sandboxes",
    description: "Every deployment runs in an isolated E2B sandbox — a real Linux environment with full network access, filesystem, and process control.",
    href: "/docs/quick-start",
    tag: "Infrastructure",
  },
  {
    icon: Zap,
    title: "Inngest Workflows",
    description: "Long-running deployment pipelines powered by Inngest — durable, retryable, and observable async workflows out of the box.",
    href: "/docs/quick-start",
    tag: "Infrastructure",
  },
  {
    icon: Shield,
    title: "Automated Security Scans",
    description: "Every build is scanned for known CVEs, secrets leakage, and OWASP Top 10 vulnerabilities before any code leaves your sandbox.",
    href: "/docs/quick-start",
    tag: "Security",
  },
  {
    icon: Lock,
    title: "Isolated Environments",
    description: "Sandboxes are fully isolated from each other and from production. Run untrusted code safely without fear of cross-contamination.",
    href: "/docs/quick-start",
    tag: "Security",
  },
  {
    icon: TestTube2,
    title: "Automated Test Suite",
    description: "SecDev runs your existing test suite and generates regression tests for untested code paths, then reports coverage deltas per PR.",
    href: "/docs/quick-start",
    tag: "Testing",
  },
  {
    icon: BarChart3,
    title: "Real-time Observability",
    description: "Stream build logs, test results, and deployment metrics live. Full audit trail stored per run so you can replay any past build.",
    href: "/docs/quick-start",
    tag: "Observability",
  },
];

const tagColor: Record<string, string> = {
  "Getting Started": "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  "Integration": "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  "Infrastructure": "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  "Security": "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  "Testing": "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  "Observability": "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
};

export default function DocsIndexPage() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-10 pb-8 border-b border-gray-200 dark:border-zinc-800">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Documentation</h1>
        <p className="text-lg text-gray-500 dark:text-zinc-400 max-w-2xl">
          Learn how to deploy, test, and secure your applications with SecDev. Use the sidebar to navigate, or pick a topic below.
        </p>
        <div className="flex gap-3 mt-5">
          <Link
            href="/docs/quick-start"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
          >
            Quick Start <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/console/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-semibold rounded-lg hover:border-gray-500 dark:hover:border-zinc-500 transition-colors"
          >
            Open Console
          </Link>
        </div>
      </div>

      {/* All features grid */}
      <h2 className="text-sm font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-5">All Features</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.title}
              href={f.href}
              className="group flex flex-col gap-3 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all hover:border-gray-400 dark:hover:border-zinc-600 hover:shadow-sm cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-gray-700 dark:text-zinc-300" />
                </div>
                <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${tagColor[f.tag] ?? ""}`}>
                  {f.tag}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-black dark:group-hover:text-white mb-1">
                  {f.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-500 leading-relaxed">{f.description}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500 group-hover:text-gray-700 dark:group-hover:text-zinc-300 transition-colors mt-auto">
                Read more <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
