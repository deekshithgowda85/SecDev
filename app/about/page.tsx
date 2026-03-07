import Link from "next/link";

const values = [
  {
    title: "Security First",
    description:
      "Every feature is designed with isolation and least-privilege in mind. We eat our own dog food — SecDev is deployed on SecDev.",
  },
  {
    title: "Developer Experience",
    description:
      "Zero config. Paste a repo URL and go. We handle environment detection, dependency installation and orchestration automatically.",
  },
  {
    title: "Open Standards",
    description:
      "Built on open-source primitives: E2B sandboxes, Inngest workflows, and Next.js. No proprietary lock-in.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24 px-6">
      <div className="mx-auto max-w-3xl">
        {/* Hero */}
        <div className="mb-20">
          <h1 className="text-5xl font-bold tracking-tight mb-6">About SecDev</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            SecDev is a cloud platform that lets you deploy any GitHub repository into a secure, isolated sandbox, run
            automated tests, and scan for vulnerabilities — all in one workflow.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We built SecDev because deploying code safely is still too hard. Too many teams ship untested changes to
            production because the feedback loop from code → environment → test results is broken. SecDev closes that
            loop.
          </p>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-2xl font-semibold mb-8">What We Believe</h2>
          <div className="flex flex-col gap-8">
            {values.map((v) => (
              <div key={v.title} className="border-l-2 border-border pl-6">
                <h3 className="font-semibold text-lg mb-1">{v.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div className="mb-20">
          <h2 className="text-2xl font-semibold mb-6">Built With</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {["Next.js", "E2B", "Inngest", "Firebase", "TypeScript", "Tailwind CSS", "Framer Motion", "shadcn/ui"].map(
              (tech) => (
                <div
                  key={tech}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-center text-muted-foreground"
                >
                  {tech}
                </div>
              )
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to try it?</h2>
          <p className="text-muted-foreground mb-6">Start deploying in seconds — no credit card required.</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/console"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              Open Console
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
