"use client";
import { useState } from "react";
import { Save, GitBranch, Terminal, Globe, Layers } from "lucide-react";

const TABS = ["General", "Build", "Domains", "Advanced"] as const;
type Tab = typeof TABS[number];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}

function Input({ defaultValue, placeholder }: { defaultValue?: string; placeholder?: string }) {
  return (
    <input
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500 dark:focus:border-zinc-400 transition-colors"
    />
  );
}

function Select({ defaultValue, options }: { defaultValue: string; options: string[] }) {
  return (
    <select
      defaultValue={defaultValue}
      className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500 dark:focus:border-zinc-400 transition-colors"
    >
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("General");
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">Configure your project deployment settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === t
                ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 space-y-6">
        {tab === "General" && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-zinc-300 pb-2 border-b border-gray-100 dark:border-zinc-800">
              <Layers className="w-4 h-4" /> General Settings
            </div>
            <div className="grid gap-5">
              <Field label="Project Name" hint="Used as the deployment subdomain prefix.">
                <Input defaultValue="secdev-api" />
              </Field>
              <Field label="Framework" hint="Auto-detected from your repository. Change only if needed.">
                <Select defaultValue="Next.js" options={["Next.js", "Node.js", "Python / FastAPI", "Static", "Other"]} />
              </Field>
              <Field label="Root Directory" hint="Directory where your code lives, relative to the repository root.">
                <Input defaultValue="/" placeholder="./" />
              </Field>
            </div>
          </>
        )}

        {tab === "Build" && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-zinc-300 pb-2 border-b border-gray-100 dark:border-zinc-800">
              <Terminal className="w-4 h-4" /> Build & Start Commands
            </div>
            <div className="grid gap-5">
              <Field label="Install Command" hint="Package installation command. Uses npm ci by default.">
                <Input defaultValue="npm ci" />
              </Field>
              <Field label="Build Command" hint="Command to build your application.">
                <Input defaultValue="npm run build" />
              </Field>
              <Field label="Start Command" hint="Command to start your production server.">
                <Input defaultValue="npm run start" />
              </Field>
              <Field label="Port" hint="Port your application listens on. Default: 3000.">
                <Input defaultValue="3000" />
              </Field>
              <Field label="Default Branch" hint="Branch that triggers production deployments.">
                <div className="relative">
                  <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                  <input
                    defaultValue="main"
                    className="w-full pl-8 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500 dark:focus:border-zinc-400 transition-colors"
                  />
                </div>
              </Field>
            </div>
          </>
        )}

        {tab === "Domains" && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-zinc-300 pb-2 border-b border-gray-100 dark:border-zinc-800">
              <Globe className="w-4 h-4" /> Custom Domains
            </div>
            <div className="space-y-3">
              {["secdev-api.vercel.app (auto)", "api.secdev.app (custom)"].map((domain, i) => (
                <div key={domain} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-800 dark:text-zinc-200 font-mono">{domain.replace(" (auto)", "").replace(" (custom)", "")}</span>
                    {i === 0 && <span className="text-xs text-gray-400 dark:text-zinc-500 bg-gray-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded">Default</span>}
                  </div>
                  {i !== 0 && <button className="text-xs text-red-500 hover:text-red-600 transition-colors">Remove</button>}
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <input placeholder="Add another domain..." className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500 dark:focus:border-zinc-400 transition-colors" />
                <button className="px-3 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors">Add</button>
              </div>
            </div>
          </>
        )}

        {tab === "Advanced" && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-zinc-300 pb-2 border-b border-gray-100 dark:border-zinc-800">
              Advanced
            </div>
            <div className="space-y-5">
              <Field label="Node.js Version" hint="Node version used during build.">
                <Select defaultValue="20.x (LTS)" options={["20.x (LTS)", "18.x", "22.x (latest)"]} />
              </Field>
              <Field label="Timeout" hint="Maximum deployment duration in seconds.">
                <Input defaultValue="300" />
              </Field>
              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">Danger Zone</p>
                <button className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                  Delete Project
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-all ${
            saved
              ? "bg-green-600 text-white"
              : "bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 text-white"
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
