"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  AlertTriangle,
  WifiOff,
} from "lucide-react";

const E2B_TIMEOUT_MS = 30 * 60 * 1000;

interface LogLine {
  ts: number;
  level: "info" | "error" | "warn";
  msg: string;
}

interface DeploymentRecord {
  sandboxId: string;
  repoUrl: string;
  repoName: string;
  branch: string;
  publicUrl: string;
  logsUrl: string;
  status: "deploying" | "live" | "failed";
  startedAt: number;
  logs: LogLine[];
}

const LEVEL_STYLE: Record<LogLine["level"], string> = {
  info: "text-gray-300 dark:text-zinc-300",
  error: "text-red-400",
  warn: "text-yellow-400",
};

const LEVEL_PREFIX: Record<LogLine["level"], string> = {
  info: "",
  error: "[ERR] ",
  warn: "[WRN] ",
};

export default function Page() {
  const params = useParams<{ id: string }>();
  const sandboxId = params.id;
  const router = useRouter();

  const [record, setRecord] = useState<DeploymentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [redeploying, setRedeploying] = useState(false);
  const [checking, setChecking] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRecord = useCallback(async () => {
    try {
      const res = await fetch(`/api/deploy/${sandboxId}`);
      if (!res.ok) {
        const text = await res.text();
        setError(`HTTP ${res.status}: ${text}`);
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setRecord(data.deployment);
      } else {
        setError(data.error ?? "Unknown error");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [sandboxId]);

  // Start/stop polling based on deployment status
  useEffect(() => {
    fetchRecord();
    pollingRef.current = setInterval(() => {
      setRecord((prev) => {
        if (!prev || prev.status === "deploying") {
          fetchRecord();
        }
        return prev;
      });
    }, 2_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchRecord]);

  // Stop polling once deployment settles
  useEffect(() => {
    if (record?.status !== "deploying" && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [record]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [record?.logs.length, autoScroll]);

  const handleScroll = () => {
    const el = logContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(isAtBottom);
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await fetch(`/api/deploy/${sandboxId}`, { method: "DELETE" });
      await fetchRecord();
    } finally {
      setStopping(false);
    }
  };

  const handleRedeploy = async () => {
    setRedeploying(true);
    try {
      const res = await fetch(`/api/deploy/${sandboxId}`, { method: "POST" });
      const data = await res.json();
      if (data.ok && data.deployment?.sandboxId) {
        router.push(`/console/deployments/${data.deployment.sandboxId}`);
      } else {
        setError(data.error ?? "Redeploy failed");
      }
    } catch {
      setError("Network error — could not redeploy");
    } finally {
      setRedeploying(false);
    }
  };

  const handleCheckAlive = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/deploy/${sandboxId}`, { method: "PATCH" });
      const data = await res.json();
      if (data.ok) {
        // Refresh the record so the UI reflects the updated status
        await fetchRecord();
      }
    } finally {
      setChecking(false);
    }
  };

  const StatusIcon = () => {
    if (!record) return null;
    if (record.status === "deploying")
      return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
    if (record.status === "live")
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const statusLabel: Record<DeploymentRecord["status"], string> = {
    deploying: "Deploying…",
    live: "Live",
    failed: "Failed",
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/console/deployments"
          className="p-2 rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {record?.repoName ?? sandboxId}
            </h1>
            {record && (
              <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium shrink-0
                bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300">
                <StatusIcon />
                {statusLabel[record.status]}
              </span>
            )}
          </div>
          {record && (
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono mt-0.5">
              {sandboxId} · branch: {record.branch} · started{" "}
              {new Date(record.startedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {record?.status === "deploying" && (
            <button
              onClick={fetchRecord}
              className="p-2 rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {/* Check if still alive — useful when sandbox may have timed out */}
          {record?.status === "live" && (
            <button
              onClick={handleCheckAlive}
              disabled={checking}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
              title="Ping the sandbox to confirm it is still running"
            >
              {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <WifiOff className="w-3 h-3" />}
              {checking ? "Checking…" : "Check alive"}
            </button>
          )}
          {record?.status === "live" && (
            <a
              href={record.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Open App
            </a>
          )}
          {/* Redeploy button — always visible for failed; also visible for live if timed out */}
          {record && (record.status === "failed" || (record.status === "live" && Date.now() - record.startedAt > E2B_TIMEOUT_MS)) && (
            <button
              onClick={handleRedeploy}
              disabled={redeploying}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {redeploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              {redeploying ? "Starting…" : "Redeploy"}
            </button>
          )}
          {record && record.status !== "failed" && (
            <button
              onClick={handleStop}
              disabled={stopping}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              {stopping ? "Stopping…" : "Stop"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!record && !error && (
        <div className="flex items-center justify-center py-20 text-gray-400 dark:text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading deployment…
        </div>
      )}

      {record && (
        <>
          {/* Log terminal */}
          <div className="bg-gray-950 dark:bg-black rounded-xl border border-gray-800 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 dark:border-zinc-800">
              <span className="text-xs font-mono text-gray-400 dark:text-zinc-500">
                Build &amp; Deploy Logs — {record.logs.length} lines
              </span>
              {!autoScroll && (
                <button
                  onClick={() => {
                    setAutoScroll(true);
                    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  ↓ Jump to bottom
                </button>
              )}
            </div>
            <div
              ref={logContainerRef}
              onScroll={handleScroll}
              className="h-[60vh] overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-0.5"
            >
              {record.logs.length === 0 && (
                <p className="text-gray-500 dark:text-zinc-600 italic">
                  Waiting for logs…
                </p>
              )}
              {record.logs.map((line, i) => (
                <div key={i} className={`${LEVEL_STYLE[line.level]} whitespace-pre-wrap break-all`}>
                  <span className="text-gray-600 dark:text-zinc-600 select-none mr-2">
                    {new Date(line.ts).toISOString().slice(11, 23)}
                  </span>
                  <span className="text-gray-500 dark:text-zinc-500 select-none mr-1">
                    {LEVEL_PREFIX[line.level]}
                  </span>
                  {line.msg}
                </div>
              ))}
              {record.status === "deploying" && (
                <div className="flex items-center gap-2 text-yellow-500 mt-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Pipeline running…</span>
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Public URL card — shown as soon as sandbox is created */}
          {record.publicUrl && (
            <div className={`mt-4 px-4 py-3 border rounded-xl flex items-center justify-between ${
              record.status === "live"
                ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20"
                : record.status === "failed"
                ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
                : "bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
            }`}>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold mb-0.5 ${
                  record.status === "live"
                    ? "text-green-700 dark:text-green-400"
                    : record.status === "failed"
                    ? "text-red-700 dark:text-red-400"
                    : "text-gray-600 dark:text-zinc-400"
                }`}>
                  {record.status === "live"
                    ? "Deployment is live!"
                    : record.status === "failed"
                    ? "Deployment failed — URL was allocated:"
                    : "Preview URL (app starting up…)"}
                </p>
                <p className="text-xs font-mono text-gray-600 dark:text-zinc-300 break-all">
                  {record.publicUrl}
                </p>
              </div>
              <a
                href={record.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`ml-4 shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  record.status === "live"
                    ? "text-white bg-green-700 hover:bg-green-800"
                    : "text-gray-500 dark:text-zinc-400 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600"
                }`}
              >
                <ExternalLink className="w-3 h-3" />
                Open
              </a>
            </div>
          )}

          {record.status === "failed" && !record.publicUrl && (
            <div className="mt-4 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                Deployment failed
              </p>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-red-600 dark:text-red-500">
                  Check the logs above for error details.
                </p>
                <button
                  onClick={handleRedeploy}
                  disabled={redeploying}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60 shrink-0"
                >
                  {redeploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                  {redeploying ? "Starting…" : "Redeploy"}
                </button>
              </div>
            </div>
          )}
          {/* Timed-out warning for live sandboxes older than 30 min */}
          {record.status === "live" && Date.now() - record.startedAt > E2B_TIMEOUT_MS && (
            <div className="mt-4 px-4 py-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                      Sandbox may have timed out
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5">
                      E2B sandboxes shut down after 30 minutes. Click &ldquo;Check alive&rdquo; to confirm, or Redeploy to start a fresh instance.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCheckAlive}
                    disabled={checking}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-500/30 hover:bg-orange-100 dark:hover:bg-orange-500/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <WifiOff className="w-3 h-3" />}
                    {checking ? "Checking…" : "Check alive"}
                  </button>
                  <button
                    onClick={handleRedeploy}
                    disabled={redeploying}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {redeploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    {redeploying ? "Starting…" : "Redeploy"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
