"use client";
import { useState } from "react";
import { CreditCard, Check, AlertTriangle } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    desc: "For personal projects and experimentation.",
    features: ["3 deployments / day", "1 active sandbox", "Basic logs", "Community support"],
    current: false,
  },
  {
    name: "Pro",
    price: "$19",
    desc: "For professional developers and small teams.",
    features: ["Unlimited deployments", "5 active sandboxes", "Full log history", "Priority support", "Custom domains", "API Testing"],
    current: true,
  },
  {
    name: "Team",
    price: "$49",
    desc: "For growing teams that need more power.",
    features: ["Everything in Pro", "20 active sandboxes", "Advanced security scans", "Dedicated infra", "SSO / SAML", "SLA guarantee"],
    current: false,
  },
] as const;

function UsageBar({ label, used, max, unit }: { label: string; used: number; max: number; unit: string }) {
  const pct = Math.min((used / max) * 100, 100);
  const color = pct > 80 ? "bg-red-500" : pct > 60 ? "bg-yellow-500" : "bg-gray-900 dark:bg-white";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-700 dark:text-zinc-300">{label}</span>
        <span className="text-sm text-gray-500 dark:text-zinc-400">{used} / {max} {unit}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">Manage your subscription and usage</p>
      </div>

      {/* Current Plan */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-zinc-500 font-medium mb-1">Current Plan</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">Pro</span>
              <span className="text-lg text-gray-500 dark:text-zinc-400">$19/month</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            Active
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mb-4">Next billing date: <span className="text-gray-700 dark:text-zinc-300 font-medium">April 7, 2026</span></p>
        <div className="flex gap-3">
          <button className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors">
            Upgrade to Team
          </button>
          <button
            onClick={() => setConfirmCancel(true)}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 hover:border-red-400 hover:text-red-500 rounded-lg transition-colors"
          >
            Cancel Subscription
          </button>
        </div>
        {confirmCancel && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Are you sure? You will lose Pro features immediately.</span>
            <button onClick={() => setConfirmCancel(false)} className="ml-auto px-3 py-1 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-500">Confirm</button>
            <button onClick={() => setConfirmCancel(false)} className="text-xs underline">Never mind</button>
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">Usage This Month</h2>
        <div className="space-y-5">
          <UsageBar label="Deployments" used={34} max={999} unit="deploys" />
          <UsageBar label="Active Sandboxes" used={2} max={5} unit="sandboxes" />
          <UsageBar label="Bandwidth" used={8.2} max={100} unit="GB" />
          <UsageBar label="Build Minutes" used={187} max={400} unit="min" />
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Compare Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-5 flex flex-col gap-4 ${
                plan.current
                  ? "border-gray-900 dark:border-white bg-gray-50 dark:bg-zinc-800"
                  : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base font-bold text-gray-900 dark:text-white">{plan.name}</span>
                  {plan.current && (
                    <span className="text-xs bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-2 py-0.5 rounded-full font-medium">Current</span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{plan.price}<span className="text-sm text-gray-400 dark:text-zinc-500 font-normal">/mo</span></p>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">{plan.desc}</p>
              </div>
              <ul className="space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={plan.current}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                  plan.current
                    ? "bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400 cursor-default"
                    : "border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                }`}
              >
                {plan.current ? "Current Plan" : "Select"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Payment Method</h2>
          <button className="text-xs text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors">Update</button>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
          <CreditCard className="w-5 h-5 text-gray-400 dark:text-zinc-500" />
          <div>
            <p className="text-sm text-gray-800 dark:text-zinc-200 font-medium">Visa ending in 4242</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Expires 08/28</p>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Invoices</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {[
            { month: "March 2026", amount: "$19.00", status: "Paid" },
            { month: "February 2026", amount: "$19.00", status: "Paid" },
            { month: "January 2026", amount: "$19.00", status: "Paid" },
          ].map((inv) => (
            <div key={inv.month} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div>
                <p className="text-sm text-gray-800 dark:text-zinc-200">{inv.month}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-500">Pro Plan · {inv.amount}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                  {inv.status}
                </span>
                <button className="text-xs text-gray-700 dark:text-zinc-300 hover:underline">Download</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
