import { Shield, Zap, GitBranch, Terminal, Lock, BarChart3 } from "lucide-react";

const features = [
  {
    icon: GitBranch,
    title: "GitHub Integration",
    description:
      "Connect any public or private GitHub repository in seconds. SecDev automatically detects your stack and sets up the environment.",
  },
  {
    icon: Terminal,
    title: "E2B Sandboxes",
    description:
      "Every deployment runs in an isolated E2B sandbox — a real Linux environment with full network access, filesystem, and process control.",
  },
  {
    icon: Zap,
    title: "Inngest Workflows",
    description:
      "Long-running deployment pipelines are powered by Inngest, giving you durable, retryable, and observable async workflows out of the box.",
  },
  {
    icon: Shield,
    title: "Automated Security Scans",
    description:
      "Every build is scanned for known CVEs, secrets leakage, and OWASP Top 10 vulnerabilities before any code leaves your sandbox.",
  },
  {
    icon: Lock,
    title: "Isolated Environments",
    description:
      "Sandboxes are fully isolated from each other and from production. Run untrusted code safely without fear of cross-contamination.",
  },
  {
    icon: BarChart3,
    title: "Real-time Observability",
    description:
      "Stream build logs, test results, and deployment metrics live. Full audit trail stored per run so you can replay any past build.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4">Platform Features</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to deploy, test and secure your GitHub repositories — fully automated, fully isolated.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4 hover:border-border/60 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
