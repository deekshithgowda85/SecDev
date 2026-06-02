"use client";

import { useState } from "react";
import { Github, User, Lock, ShieldAlert, Camera, Check, Eye, EyeOff } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import type { UserProfile } from "@/lib/user-auth";

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-5 flex items-center gap-2 border-b border-gray-100 pb-3 text-sm font-semibold text-gray-900 dark:border-zinc-800 dark:text-white">
        <span className="text-gray-500 dark:text-zinc-400">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-zinc-300">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400 dark:text-zinc-600">{hint}</p>}
    </div>
  );
}

function formatCreatedAt(createdAt: number): string {
  const timestamp = Number(createdAt);
  if (!Number.isFinite(timestamp)) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
}

export function AccountPageClient({ user, hasGithubConnection }: { user: UserProfile | null; hasGithubConnection: boolean }) {
  const [displayName, setDisplayName] = useState(user?.name ?? user?.email?.split("@")[0] ?? "");
  const [username, setUsername] = useState(user?.id ?? "");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  
  // Account destruction state handlers
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Dynamic Session Management State (Fixes #44)
  const [sessions, setSessions] = useState([
    { id: "chrome-macos", device: "Chrome on macOS", loc: "Bengaluru, IN", current: true },
    { id: "vscode-ext", device: "VS Code Extension", loc: "Bengaluru, IN", current: false },
  ]);

  const saveProfile = () => {
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const savePw = () => {
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2000);
  };

  const handleRevokeSession = async (id: string, device: string) => {
    if (!window.confirm(`Are you sure you want to terminate your active session on "${device}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/user/sessions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      
      const data = await res.json();
      if (res.ok && data.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert(data.error ?? "Failed to revoke active session.");
      }
    } catch {
      alert("Network error occurred while trying to terminate connection session.");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "delete my account") return;

    const doubleConfirm = window.confirm(
      "CRITICAL WARNING: Are you completely sure you want to delete your account? This will instantly purge all sandboxes, deployments, security logs, and custom configuration secrets permanently."
    );
    if (!doubleConfirm) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        alert("Your account has been successfully deleted. Goodbye!");
        signOut({ callbackUrl: "/" });
      } else {
        setDeleteError(data.error ?? "Failed to delete account. Please try again.");
      }
    } catch {
      setDeleteError("Network error occurred. Unable to connect to authentication server.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-500">Manage your profile and security settings</p>
        </div>

        {deleteError && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-700 dark:text-red-400">
            {deleteError}
          </div>
        )}

        <Section title="Profile" icon={<User className="h-4 w-4" />}>
          <div className="space-y-5">
            {!hasGithubConnection && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">GitHub connection</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                  Connect GitHub after credentials login to unlock repository features.
                </p>
                <button
                  type="button"
                  onClick={() => signIn("github", { callbackUrl: "/console/account" })}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                >
                  <Github className="h-4 w-4" />
                  Connect GitHub
                </button>
              </div>
            )}

            {/* Fixed Avatar Element: Semantic button wrapper with keyboard focus accessibility */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Change account avatar"
                className="group relative focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white rounded-full transition-shadow"
              >
                <div className="flex h-16 w-16 select-none items-center justify-center rounded-full bg-gray-900 text-2xl font-bold text-white dark:bg-white dark:text-gray-900">
                  {user?.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </button>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">Account Avatar</p>
                <p className="text-xs text-gray-500 dark:text-zinc-500">Click avatar badge to update graphics controls.</p>
              </div>
            </div>

            <Field label="Display Name">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-gray-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-zinc-400"
              />
            </Field>
            <Field label="Email Address">
              <input
                value={user?.email ?? ""}
                placeholder="Email managed by provider"
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-gray-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-zinc-400"
              />
            </Field>
            <Field label="Username">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-gray-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-zinc-400"
              />
            </Field>
            <Field label="Created At">
              <input
                value={user?.createdAt ? formatCreatedAt(user.createdAt) : ""}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-gray-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-zinc-400"
              />
            </Field>
            <button
              onClick={saveProfile}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                profileSaved
                  ? "bg-green-600 text-white"
                  : "bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              }`}
            >
              {profileSaved && <Check className="h-4 w-4" />}
              {profileSaved ? "Saved!" : "Save Profile"}
            </button>
          </div>
        </Section>

        <Section title="Security" icon={<Lock className="h-4 w-4" />}>
          <div className="space-y-5">
            <Field label="Current Password">
              <div className="relative">
                <input
                  type={showOld ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pr-10 text-sm text-gray-900 transition-colors focus:border-gray-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="New Password" hint="Minimum 8 characters. Use uppercase, numbers, and symbols.">
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pr-10 text-sm text-gray-900 transition-colors focus:border-gray-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <button
              onClick={savePw}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                pwSaved
                  ? "bg-green-600 text-white"
                  : "bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              }`}
            >
              {pwSaved && <Check className="h-4 w-4" />}
              {pwSaved ? "Updated!" : "Update Password"}
            </button>
          </div>
        </Section>

        <Section title="Active Sessions" icon={<Lock className="h-4 w-4" />}>
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-zinc-800">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">{s.device}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">{s.loc}</p>
                </div>
                {s.current ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                    Current
                  </span>
                ) : (
                  <button 
                    onClick={() => handleRevokeSession(s.id, s.device)}
                    className="text-xs text-red-500 transition-colors hover:text-red-600 font-semibold"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </Section>

        <div className="rounded-xl border border-red-200 bg-white p-6 dark:border-red-500/30 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2 border-b border-red-100 pb-3 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:text-red-400">
            <ShieldAlert className="h-4 w-4" />
            Danger Zone
          </div>
          <p className="mb-4 text-sm text-gray-600 dark:text-zinc-400">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Field label='Type "delete my account" to confirm'>
            <input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder='delete my account'
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </Field>
          <button
            onClick={handleDeleteAccount}
            disabled={deleteInput !== "delete my account" || deleting}
            className={`mt-4 rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              deleteInput === "delete my account" && !deleting
                ? "bg-red-600 text-white hover:bg-red-500"
                : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600"
            }`}
          >
            {deleting ? "Deleting Account..." : "Delete My Account"}
          </button>
        </div>
    </div>
  );
}
