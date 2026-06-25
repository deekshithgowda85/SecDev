"use client";

import { useState } from "react";
import { Key, Eye, EyeOff, Save, Check, RefreshCw, AlertCircle } from "lucide-react";

export default function SecretsPage() {
  // Visibility States for sensitive keys (Fixes #50)
  const [showGroq, setShowGroq] = useState(false);
  const [showEncryption, setShowEncryption] = useState(false);

  // Input Value States
  const [groqKey, setGroqKey] = useState("gsk_yA7b9xWp2RnM4kLq9vJc23H8zF4s1t6N");
  const [encryptionKey, setEncryptionKey] = useState("enc_sec_99f2e301ab8c7d5d6e2f4a5b6c7d8e9f");

  // Status indicators
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSecrets = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulate API storage communication delay
    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Key className="w-6 h-6 text-indigo-500" /> Secrets & Environment Keys
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Configure runtime API tokens and cryptographic variables securely for your workspace deployments.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <p className="font-semibold">Security Isolation Notice:</p>
          <p>Values are encrypted at rest using AES-256 GCM before infrastructure synchronization. Tokens are injected as read-only variables inside running sandboxes.</p>
        </div>
      </div>

      <form onSubmit={handleSaveSecrets} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
          
          {/* GROQ API KEY CONFIGURATION FIELD */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
              Groq API Key
            </label>
            <div className="relative">
              <input
                type={showGroq ? "text" : "password"}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full font-mono rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 pr-10 text-sm text-gray-900 transition-colors focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-indigo-400"
              />
              <button
                type="button"
                onClick={() => setShowGroq(!showGroq)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                title={showGroq ? "Hide token string" : "Reveal token string"}
              >
                {showGroq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400 dark:text-zinc-500">
              Required for routing low-latency inference queries to Llama models.
            </p>
          </div>

          <div className="w-full border-t border-gray-100 dark:border-zinc-800 my-2" />

          {/* SYSTEM ENCRYPTION SECRET FIELD */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
              System Encryption Secret
            </label>
            <div className="relative">
              <input
                type={showEncryption ? "text" : "password"}
                value={encryptionKey}
                onChange={(e) => setEncryptionKey(e.target.value)}
                placeholder="enc_sec_..."
                className="w-full font-mono rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 pr-10 text-sm text-gray-900 transition-colors focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-indigo-400"
              />
              <button
                type="button"
                onClick={() => setShowEncryption(!showEncryption)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                title={showEncryption ? "Hide token string" : "Reveal token string"}
              >
                {showEncryption ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400 dark:text-zinc-500">
              Salt token string used for standard cryptographic hashes. Do not change this lightly.
            </p>
          </div>

        </div>

        {/* SUBMISSION FOOTER BUTTON GROUP */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-sm ${
              saveSuccess
                ? "bg-green-600"
                : "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
            }`}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving Secrets…" : saveSuccess ? "Saved Successfully!" : "Save Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}