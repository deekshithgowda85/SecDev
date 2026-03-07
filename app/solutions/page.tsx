import { Workflow, FlaskConical, ShieldCheck, Rocket } from "lucide-react";
import Link from "next/link";

const useCases = [
  {
    icon: Rocket,
    title: "Continuous Deployment",
    subtitle: "Push → Sandbox → Ship",
    description:
      "Every push to your main branch triggers a full deployment into a dedicated sandbox. Review the live environment before merging to production.",
    cta: { label: "Try it free", href: "/register" },
  },
  {
    icon: FlaskConical,
    title: "AI-Assisted QA",
    subtitle: "Automated test generation & execution",
    description:
      "SecDev runs your existing test suite and uses AI agents to generate regression tests for untested code paths, then reports coverage deltas per PR.",
    cta: { label: "See a demo", href: "/console" },
  },
  {
    icon: ShieldCheck,
    title: "Security Hardening",
    subtitle: "Catch vulnerabilities before they ship",
    description:
      "Static analysis, dependency audits, and runtime behaviour checks run on every build. Findings are surfaced inline with fix suggestions.",
    cta: { label: "Learn more", href: "/features" },
  },
  {
    icon: Workflow,
    title: "Workflow Automation",
    subtitle: "Durable pipelines with Inngest",
    description:
      "Define multi-step deployment pipelines as code. Inngest handles retries, fan-out, and scheduling so you never lose a build event.",
    cta: { label: "Get started", href: "/register" },
  },
];

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4">Solutions</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From solo developers to enterprise teams — SecDev adapts to how you ship software.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {useCases.map((u) => (
            <div
              key={u.title}
              className="rounded-2xl border border-border bg-card p-8 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
                  <u.icon className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg leading-tight">{u.title}</h3>
                  <p className="text-xs text-muted-foreground">{u.subtitle}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{u.description}</p>
              <Link
                href={u.cta.href}
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                {u.cta.label} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
