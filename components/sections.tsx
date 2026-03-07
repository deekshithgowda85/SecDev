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
    <section id="features" className="bg-black dark:bg-black text-white py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-cyan-400 text-sm uppercase tracking-widest mb-3">Features</p>
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl">
          Everything you need to ship with confidence
        </h2>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-cyan-400 mb-4">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SolutionsSection() {
  return (
    <section id="solutions" className="bg-zinc-950 dark:bg-zinc-950 text-white py-24 px-6">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-cyan-400 text-sm uppercase tracking-widest mb-3">Solutions</p>
          <h2 className="text-4xl font-semibold tracking-tight mb-6">
            Built for teams that move fast
          </h2>
          <ul className="space-y-4 text-zinc-400 text-sm">
            {[
              "CI/CD — validate every PR in an isolated sandbox before it merges",
              "QA — spin ephemeral environments for manual or automated testing",
              "Security — scan builds in sandboxes without touching production",
              "Demos — share live preview URLs with clients in seconds",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-cyan-400/20 text-cyan-400 flex items-center justify-center text-xs">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex gap-4">
            <Link href="/register" className="rounded-full bg-white text-black text-sm font-medium px-6 py-3 hover:bg-zinc-200 transition-colors">
              Get started free
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 font-mono text-sm text-green-400 space-y-2">
          <p className="text-zinc-500"># Deploy workflow</p>
          <p><span className="text-cyan-400">POST</span> /api/deploy</p>
          <p className="text-zinc-400">{"{ repoUrl: 'github.com/you/app' }"}</p>
          <p className="text-zinc-500 mt-4"># Response</p>
          <p>{"{ status: 'started',"}</p>
          <p>{"  publicUrl: 'https://abc123.e2b.dev',"}</p>
          <p>{"  logsUrl: '/deployments/abc/logs' }"}</p>
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
    <section id="documentation" className="bg-black dark:bg-black text-white py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-cyan-400 text-sm uppercase tracking-widest mb-3">Documentation</p>
        <h2 className="text-4xl font-semibold tracking-tight mb-10">
          Guides & API reference
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {docs.map((d) => (
            <Link
              key={d.title}
              href={d.href}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors"
            >
              <h3 className="font-semibold mb-2 group-hover:text-cyan-400 transition-colors">{d.title}</h3>
              <p className="text-sm text-zinc-400">{d.desc}</p>
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
