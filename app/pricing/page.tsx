import Link from "next/link";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Hobby",
    price: "Free",
    description: "For side projects and personal experiments.",
    cta: { label: "Get started", href: "/register" },
    features: [
      "5 sandbox deployments / month",
      "1 concurrent sandbox",
      "Public repositories only",
      "Community support",
      "Build logs (7-day retention)",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    per: "/ month",
    description: "For developers and small teams shipping real products.",
    cta: { label: "Start free trial", href: "/register" },
    features: [
      "Unlimited deployments",
      "5 concurrent sandboxes",
      "Private repositories",
      "AI-powered test generation",
      "Security scan reports",
      "Build logs (90-day retention)",
      "Email support",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large teams with advanced compliance and scale needs.",
    cta: { label: "Contact us", href: "mailto:hello@secdev.io" },
    features: [
      "Unlimited everything",
      "SSO / SAML",
      "Audit logs & compliance reports",
      "Dedicated sandbox clusters",
      "SLA guarantee",
      "Slack + dedicated support",
      "Custom integrations",
    ],
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4">Simple Pricing</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No hidden fees. Start free, scale when you need to.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-8 flex flex-col gap-6 ${
                tier.highlight
                  ? "border-foreground/30 bg-foreground/5 ring-1 ring-foreground/10"
                  : "border-border bg-card"
              }`}
            >
              {tier.highlight && (
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Most Popular
                </span>
              )}
              <div>
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.per && <span className="text-muted-foreground mb-1">{tier.per}</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
              </div>

              <ul className="flex flex-col gap-2 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-foreground" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.cta.href}
                className={`block text-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  tier.highlight
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "border border-border hover:bg-accent"
                }`}
              >
                {tier.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
