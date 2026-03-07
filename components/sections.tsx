import Link from "next/link";
import { GitBranch, Layers, FlaskConical, Globe, Zap, Shield } from "lucide-react";

const FEATURES = [
  {
    icon: <GitBranch className="w-5 h-5" />,
    title: "GitHub Integration",
    desc: "Connect any public or private repo. Enter the URL and we do the rest.",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "E2B Sandboxes",
    desc: "Each deployment runs in a fully isolated, ephemeral cloud sandbox.",
  },
  {
    icon: <FlaskConical className="w-5 h-5" />,
    title: "Automated Tests",
    desc: "Inngest workflows trigger test suites automatically after every deploy.",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    title: "Live Preview URLs",
    desc: "Get a public URL the moment your sandbox build succeeds.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Real-time Logs",
    desc: "Stream build and test logs live to your dashboard.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Firebase Auth",
    desc: "Secure Google or email sign-in. Your sandboxes are always private.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-cyan-600 dark:text-cyan-400 text-sm uppercase tracking-widest mb-3">Features</p>
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl text-gray-900 dark:text-white">
          Everything you need to ship with confidence
        </h2>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SolutionsSection() {
  return (
    <section id="solutions" className="bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white py-24 px-6">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-cyan-600 dark:text-cyan-400 text-sm uppercase tracking-widest mb-3">Solutions</p>
          <h2 className="text-4xl font-semibold tracking-tight mb-6 text-gray-900 dark:text-white">
            Built for teams that move fast
          </h2>
          <ul className="space-y-4 text-gray-600 dark:text-zinc-400 text-sm">
            {[
              "CI/CD — validate every PR in an isolated sandbox before it merges",
              "QA — spin ephemeral environments for manual or automated testing",
              "Security — scan builds in sandboxes without touching production",
              "Demos — share live preview URLs with clients in seconds",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex gap-4">
            <Link href="/register" className="rounded-full bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-medium px-6 py-3 hover:bg-gray-700 dark:hover:bg-zinc-200 transition-colors">
              Get started free
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-8 font-mono text-sm space-y-2">
          <p className="text-gray-400 dark:text-zinc-500"># Deploy workflow</p>
          <p><span className="text-cyan-600 dark:text-cyan-400">POST</span> <span className="text-gray-800 dark:text-gray-200">/api/deploy</span></p>
          <p className="text-gray-500 dark:text-zinc-400">{"{ repoUrl: 'github.com/you/app' }"}</p>
          <p className="text-gray-400 dark:text-zinc-500 mt-4"># Response</p>
          <p className="text-green-600 dark:text-green-400">{"{ status: 'started',"}</p>
          <p className="text-green-600 dark:text-green-400">{"  publicUrl: 'https://abc123.e2b.dev',"}</p>
          <p className="text-green-600 dark:text-green-400">{"  logsUrl: '/deployments/abc/logs' }"}</p>
        </div>
      </div>
    </section>
  );
}

export function DocumentationSection() {
  const docs = [
    { title: "Quickstart", desc: "Connect GitHub and deploy your first app in 2 minutes.", href: "#" },
    { title: "Sandbox Configuration", desc: "Customize memory, CPU, environment variables.", href: "#" },
    { title: "Inngest Workflows", desc: "Learn how async test jobs are orchestrated.", href: "#" },
    { title: "API Reference", desc: "Full REST API docs for /api/deploy and webhooks.", href: "#" },
  ];

  return (
    <section id="documentation" className="bg-white dark:bg-zinc-950 text-gray-900 dark:text-white py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-cyan-600 dark:text-cyan-400 text-sm uppercase tracking-widest mb-3">Documentation</p>
        <h2 className="text-4xl font-semibold tracking-tight mb-10 text-gray-900 dark:text-white">
          Guides & API reference
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {docs.map((d) => (
            <Link
              key={d.title}
              href={d.href}
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{d.title}</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400">{d.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FooterSection() {
  return (
    <footer className="bg-zinc-950 border-t border-white/10 text-zinc-500 text-sm py-10 px-6">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-white font-semibold tracking-tight">SecDev</span>
        <span>© {new Date().getFullYear()} SecDev. All rights reserved.</span>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="#" className="hover:text-white transition-colors">Terms</Link>
          <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
        </div>
      </div>
    </footer>
  );
}
