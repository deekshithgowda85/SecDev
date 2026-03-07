"use client";
import { useState } from "react";
import { User, Lock, ShieldAlert, Camera, Check, Eye, EyeOff } from "lucide-react";

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-5 pb-3 border-b border-gray-100 dark:border-zinc-800">
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
      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

export default function AccountPage() {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  const saveProfile = () => {
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };
  const savePw = () => {
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">Manage your profile and security settings</p>
      </div>

      {/* Profile */}
      <Section title="Profile" icon={<User className="w-4 h-4" />}>
        <div className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl text-white font-bold select-none">
                D
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">Profile Picture</p>
              <p className="text-xs text-gray-500 dark:text-zinc-500">Click to upload a new avatar (PNG, JPG)</p>
            </div>
          </div>

          <Field label="Display Name">
            <input
              defaultValue="Deekshith Gowda"
              className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
            />
          </Field>
          <Field label="Email Address" hint="Your email is managed through your authentication provider.">
            <input
              defaultValue="deekshith@secdev.app"
              readOnly
              className="w-full bg-gray-100 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-zinc-500 cursor-not-allowed"
            />
          </Field>
          <Field label="Username">
            <input
              defaultValue="deekshithgowda85"
              className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
            />
          </Field>
          <button
            onClick={saveProfile}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
              profileSaved ? "bg-green-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {profileSaved && <Check className="w-4 h-4" />}
            {profileSaved ? "Saved!" : "Save Profile"}
          </button>
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" icon={<Lock className="w-4 h-4" />}>
        <div className="space-y-5">
          <Field label="Current Password">
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="New Password" hint="Minimum 8 characters. Use uppercase, numbers, and symbols.">
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <button
            onClick={savePw}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
              pwSaved ? "bg-green-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {pwSaved && <Check className="w-4 h-4" />}
            {pwSaved ? "Updated!" : "Update Password"}
          </button>
        </div>
      </Section>

      {/* Sessions */}
      <Section title="Active Sessions" icon={<Lock className="w-4 h-4" />}>
        <div className="space-y-3">
          {[
            { device: "Chrome on macOS", loc: "Bengaluru, IN", current: true },
            { device: "VS Code Extension", loc: "Bengaluru, IN", current: false },
          ].map((s) => (
            <div key={s.device} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">{s.device}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-500">{s.loc}</p>
              </div>
              {s.current ? (
                <span className="text-xs bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                  Current
                </span>
              ) : (
                <button className="text-xs text-red-500 hover:text-red-600 transition-colors">Revoke</button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-500/30 rounded-xl p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 mb-4 pb-3 border-b border-red-100 dark:border-red-500/20">
          <ShieldAlert className="w-4 h-4" />
          Danger Zone
        </div>
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Field label='Type "delete my account" to confirm'>
          <input
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            placeholder='delete my account'
            className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-red-400 transition-colors"
          />
        </Field>
        <button
          disabled={deleteInput !== "delete my account"}
          className={`mt-4 px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
            deleteInput === "delete my account"
              ? "bg-red-600 hover:bg-red-500 text-white"
              : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
          }`}
        >
          Delete My Account
        </button>
      </div>
    </div>
  );
}
