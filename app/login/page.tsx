"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { signInWithEmail } from "@/lib/firebase";
import { signIn } from "next-auth/react";
import { Github } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full">
      {/* ── Left panel – form ── */}
      <div className="flex w-full flex-col justify-center px-8 py-12 sm:px-12 lg:w-1/2 xl:px-20 bg-[#0a0a0a]">
        <div className="mx-auto w-full max-w-sm">
          {/* Heading */}
          <h1 className="text-4xl font-bold text-white mb-2">Welcome</h1>
          <p className="text-sm text-zinc-400 mb-8">
            Access your account and continue your journey with us
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm text-zinc-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm text-zinc-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 pr-12 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Keep signed in + Reset password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setKeepSignedIn(!keepSignedIn)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    keepSignedIn ? "border-white bg-white" : "border-zinc-600 bg-transparent"
                  }`}
                >
                  {keepSignedIn && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>
                <span className="text-sm text-white">Keep me signed in</span>
              </label>
              <button type="button" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Reset password
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-zinc-100 text-black font-semibold py-3.5 text-sm hover:bg-white transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">or continue with</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* GitHub OAuth */}
          <button
            type="button"
            onClick={() => signIn("github", { callbackUrl: "/console/dashboard" })}
            className="mt-2 w-full flex items-center justify-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-4 py-3.5 text-sm font-semibold text-white transition-colors"
          >
            <Github className="w-4 h-4" />
            Sign in with GitHub
          </button>

          {/* Sign up link */}
          <p className="mt-6 text-center text-sm text-zinc-500">
            New to our platform?{" "}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right panel – decorative ── */}
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden">
        {/* Abstract gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-800 to-zinc-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.5)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(239,68,68,0.35)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.3)_0%,transparent_50%)]" />
        {/* Diagonal stripe overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(255,255,255,0.15) 40px, rgba(255,255,255,0.15) 80px)",
          }}
        />

        {/* Testimonial card */}
        <div className="absolute bottom-10 right-10 max-w-xs rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 p-5 shadow-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-sm">
              SC
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Sarah Chen</p>
              <p className="text-xs text-zinc-400">@sarahdigital</p>
            </div>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            "Amazing platform! The user experience is seamless and the features are exactly what I needed."
          </p>
        </div>
      </div>
    </div>
  );
}


