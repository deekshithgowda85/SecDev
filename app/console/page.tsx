"use client";
import { useState } from "react";
import { GitBranch, Loader2, CheckCircle, XCircle, Terminal, ExternalLink } from "lucide-react";

interface Deployment {
  id: string;
  repoUrl: string;
  status: "building" | "testing" | "live" | "failed";
  publicUrl?: string;
  logs: string[];
  tests: { name: string; passed: boolean }[];
}

const MOCK_LOGS = [
  "▶ Cloning repository...",
  "▶ npm install — 312 packages installed",
  "▶ next build — compiled successfully",
  "▶ Starting server on :3000",
  "✓ Health-check passed",
];

const MOCK_TESTS = [
  { name: "Homepage renders", passed: true },
  { name: "API /api/health returns 200", passed: true },
  { name: "Login form visible", passed: true },
  { name: "Register redirects after signup", passed: false },
];

export default function ConsolePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || "Deploy failed");

      // Simulate a live deployment with progressive status updates
      const newDep: Deployment = {
        id: data.deployment.id,
        repoUrl,
        status: "building",
        publicUrl: data.deployment.publicUrl,
        logs: [],
        tests: [],
      };
      setDeployments((prev) => [newDep, ...prev]);
      setRepoUrl("");

      // Simulate streaming logs
      for (let i = 0; i < MOCK_LOGS.length; i++) {
        await new Promise((r) => setTimeout(r, 600));
        setDeployments((prev) =>
          prev.map((d) =>
            d.id === newDep.id
              ? { ...d, logs: MOCK_LOGS.slice(0, i + 1), status: i === 3 ? "testing" : d.status }
              : d
          )
        );
      }

      // Simulate test results
      for (let i = 0; i < MOCK_TESTS.length; i++) {
        await new Promise((r) => setTimeout(r, 500));
        setDeployments((prev) =>
          prev.map((d) =>
            d.id === newDep.id
              ? { ...d, tests: MOCK_TESTS.slice(0, i + 1) }
              : d
          )
        );
      }

      // Final status
      setDeployments((prev) =>
        prev.map((d) => (d.id === newDep.id ? { ...d, status: "live" } : d))
      );
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black dark:bg-black text-white pt-20 px-6 pb-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold mb-2">Deployment Console</h1>
        <p className="text-zinc-400 text-sm mb-10">Enter a GitHub repository URL to deploy and test in an isolated sandbox.</p>

        {/* Deploy form */}
        <form onSubmit={handleDeploy} className="flex gap-3 mb-8">
          <div className="flex-1 flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
            <GitBranch className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repo"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !repoUrl.trim()}
            className="flex items-center gap-2 rounded-xl bg-white text-black text-sm font-medium px-5 py-3 hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Deploy
          </button>
        </form>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Deployment cards */}
        <div className="space-y-6">
          {deployments.map((dep) => (
            <DeploymentCard key={dep.id} deployment={dep} />
          ))}

          {deployments.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-zinc-500">
              <Terminal className="w-10 h-10 mx-auto mb-4 opacity-30" />
              <p>No deployments yet. Enter a repo URL above to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeploymentCard({ deployment: dep }: { deployment: Deployment }) {
  const statusColor = {
    building: "text-yellow-400",
    testing: "text-cyan-400",
    live: "text-green-400",
    failed: "text-red-400",
  }[dep.status];

  const statusLabel = {
    building: "Building…",
    testing: "Running tests…",
    live: "Live",
    failed: "Failed",
  }[dep.status];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <p className="text-sm font-medium">{dep.repoUrl}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{dep.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
          {dep.status === "live" && dep.publicUrl && (
            <a
              href={dep.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-cyan-400 hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> Open
            </a>
          )}
        </div>
      </div>

      {/* Logs */}
      <div className="px-5 py-4 border-b border-white/10 font-mono text-xs text-green-400 space-y-1 min-h-[80px]">
        {dep.logs.length === 0 ? (
          <span className="text-zinc-600">Initializing sandbox…</span>
        ) : (
          dep.logs.map((line, i) => <p key={i}>{line}</p>)
        )}
        {(dep.status === "building" || dep.status === "testing") && (
          <p className="text-zinc-600 animate-pulse">_</p>
        )}
      </div>

      {/* Test results */}
      {dep.tests.length > 0 && (
        <div className="px-5 py-4">
          <p className="text-xs text-zinc-500 mb-3 uppercase tracking-widest">Test Results</p>
          <div className="space-y-2">
            {dep.tests.map((t) => (
              <div key={t.name} className="flex items-center gap-3 text-sm">
                {t.passed ? (
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span className={t.passed ? "text-zinc-300" : "text-red-400"}>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
