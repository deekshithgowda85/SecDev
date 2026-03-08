'use client';
import React from 'react'
import Link from 'next/link'
import { ArrowRight, Shield, CheckCircle2, XCircle, AlertTriangle, Globe, Zap, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedGroup } from '@/components/ui/animated-group'

const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring',
                bounce: 0.3,
                duration: 1.5,
            },
        },
    },
}

/* ── inline SecDev dashboard preview ────────────────────────────────────── */
function DashboardPreview() {
    const layers = [
        { icon: Globe, label: 'Route Health', passed: 12, total: 14, color: 'blue', status: 'warn' },
        { icon: Code2, label: 'API Testing', passed: 8, total: 8, color: 'purple', status: 'pass' },
        { icon: Shield, label: 'Security Scan', passed: 5, total: 9, color: 'red', status: 'fail' },
        { icon: Zap, label: 'Performance', passed: 6, total: 6, color: 'yellow', status: 'pass' },
    ]

    const colorMap: Record<string, { bar: string; text: string; badge: string; bg: string }> = {
        blue: { bar: 'bg-blue-500', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300', bg: 'bg-blue-500/10' },
        purple: { bar: 'bg-purple-500', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300', bg: 'bg-purple-500/10' },
        red: { bar: 'bg-red-500', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300', bg: 'bg-red-500/10' },
        yellow: { bar: 'bg-yellow-500', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300', bg: 'bg-yellow-500/10' },
    }

    const findings = [
        { sev: 'high', text: 'Missing Content-Security-Policy header on 4 routes', color: 'text-red-400' },
        { sev: 'medium', text: 'X-Frame-Options not set on /checkout route', color: 'text-yellow-400' },
        { sev: 'low', text: '/api/users returns stack trace on 500 errors', color: 'text-orange-400' },
        { sev: 'pass', text: 'All API endpoints respond within 200ms', color: 'text-green-400' },
        { sev: 'pass', text: 'Authentication middleware active on protected routes', color: 'text-green-400' },
    ]

    const navItems = ['Dashboard', 'Testing', 'Security', 'Deployments', 'Logs']

    return (
        <div className="select-none rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 text-[11px] font-mono shadow-2xl shadow-black/60">
            {/* window chrome */}
            <div className="flex items-center gap-2 px-4 h-9 border-b border-zinc-800 bg-zinc-900/80">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <div className="mx-auto flex items-center gap-2 px-3 py-0.5 bg-zinc-800/60 rounded text-zinc-500 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    secdev.io/console/testing
                </div>
            </div>

            {/* layout */}
            <div className="flex h-[340px]">
                {/* sidebar */}
                <div className="w-36 border-r border-zinc-800 p-2.5 flex flex-col gap-0.5 shrink-0">
                    <p className="text-zinc-600 text-[9px] uppercase tracking-widest px-2 mb-1 mt-1">Console</p>
                    {navItems.map((item, i) => (
                        <div key={item} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-default ${i === 1 ? 'bg-white/5 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${i === 1 ? 'bg-indigo-400' : 'bg-zinc-700'}`} />
                            {item}
                        </div>
                    ))}
                    <div className="mt-auto pt-2 border-t border-zinc-800">
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-zinc-500">
                            <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[8px] text-white font-bold">A</div>
                            <span>Alice</span>
                        </div>
                    </div>
                </div>

                {/* main */}
                <div className="flex-1 p-3 overflow-hidden flex flex-col gap-2.5">
                    {/* score pills */}
                    <div className="flex items-center gap-2">
                        <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-zinc-700 text-zinc-300 flex items-center gap-1.5">
                            <Shield className="w-3 h-3 text-indigo-400" />
                            <span className="text-[10px] font-semibold">Score: 78/100</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px]">3 Critical</div>
                        <div className="px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px]">5 Warnings</div>
                        <div className="ml-auto px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-[10px]">31 Passed</div>
                    </div>

                    {/* layer cards */}
                    <div className="grid grid-cols-2 gap-2">
                        {layers.map((layer) => {
                            const c = colorMap[layer.color]
                            const pct = Math.round((layer.passed / layer.total) * 100)
                            const Icon = layer.icon
                            return (
                                <div key={layer.label} className={`p-2.5 rounded-xl border border-zinc-800 bg-white/[0.02] flex flex-col gap-2`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Icon className={`w-3 h-3 ${c.text}`} />
                                            <span className="text-zinc-300">{layer.label}</span>
                                        </div>
                                        {layer.status === 'pass' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                                        {layer.status === 'fail' && <XCircle className="w-3 h-3 text-red-400" />}
                                        {layer.status === 'warn' && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
                                    </div>
                                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="flex items-center justify-between text-zinc-600">
                                        <span>{layer.passed}/{layer.total} passed</span>
                                        <span className={`${c.badge} px-1.5 py-0.5 rounded text-[9px]`}>{pct}%</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* findings */}
                    <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                        <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Findings</p>
                        {findings.map((f, i) => (
                            <div key={i} className="flex items-start gap-2 text-[10px]">
                                {f.sev === 'pass' ? (
                                    <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-px" />
                                ) : f.sev === 'high' ? (
                                    <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-px" />
                                ) : (
                                    <AlertTriangle className="w-3 h-3 text-yellow-400 shrink-0 mt-px" />
                                )}
                                <span className={f.color}>{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export function HeroSection() {
    return (
        <main className="overflow-hidden">
            <div
                aria-hidden
                className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
                <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(220,80%,60%,.06)_0,hsla(220,60%,40%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
                <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(260,80%,60%,.05)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
                <div className="h-[80rem] -translate-y-[350px] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
            </div>
            <section>
                <div className="relative pt-24 md:pt-36">
                    <div aria-hidden className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--background)_75%)]" />
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                            <AnimatedGroup variants={transitionVariants}>
                                <Link
                                    href="/features"
                                    className="hover:bg-gray-100 dark:hover:bg-background dark:hover:border-t-border bg-gray-50 dark:bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border border-gray-300 dark:border-border p-1 pl-4 shadow-md shadow-black/5 transition-all duration-300 dark:border-t-white/5 dark:shadow-zinc-950">
                                    <span className="text-gray-900 dark:text-foreground text-sm">Introducing AI-Powered Security Testing</span>
                                    <span className="dark:border-background block h-4 w-0.5 border-l bg-gray-300 dark:bg-zinc-700" />
                                    <div className="bg-white dark:bg-background group-hover:bg-gray-100 dark:group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                                        <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                                            <span className="flex size-6"><ArrowRight className="m-auto size-3 text-gray-900 dark:text-foreground" /></span>
                                            <span className="flex size-6"><ArrowRight className="m-auto size-3 text-gray-900 dark:text-foreground" /></span>
                                        </div>
                                    </div>
                                </Link>

                                <h1 className="mt-8 max-w-4xl mx-auto text-balance text-6xl md:text-7xl lg:mt-16 xl:text-[5.25rem] text-gray-900 dark:text-white">
                                    Automated Security Testing for Your Apps
                                </h1>
                                <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-gray-700 dark:text-gray-300">
                                    Deploy, scan, and continuously test your web applications against real-world security threats. Get layered security insights — routes, APIs, headers, and performance — all in one place.
                                </p>
                            </AnimatedGroup>

                            <AnimatedGroup
                                variants={{
                                    container: {
                                        visible: {
                                            transition: { staggerChildren: 0.05, delayChildren: 0.75 },
                                        },
                                    },
                                    ...transitionVariants,
                                }}
                                className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
                                <div
                                    key={1}
                                    className="bg-gray-200 dark:bg-white/10 rounded-[14px] border border-gray-300 dark:border-white/20 p-0.5">
                                    <Button
                                        asChild
                                        size="lg"
                                        className="rounded-xl px-5 text-base bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
                                        <Link href="/console/dashboard">
                                            <span className="text-nowrap">Open Dashboard</span>
                                        </Link>
                                    </Button>
                                </div>
                                <Button
                                    key={2}
                                    asChild
                                    size="lg"
                                    variant="ghost"
                                    className="h-10.5 rounded-xl px-5 text-gray-900 dark:text-foreground hover:bg-gray-200 dark:hover:bg-accent">
                                    <Link href="/console/testing">
                                        <Shield className="mr-2 size-4" />
                                        <span className="text-nowrap">Run Security Tests</span>
                                    </Link>
                                </Button>
                            </AnimatedGroup>
                        </div>
                    </div>

                    <AnimatedGroup
                        variants={{
                            container: {
                                visible: {
                                    transition: { staggerChildren: 0.05, delayChildren: 0.75 },
                                },
                            },
                            ...transitionVariants,
                        }}>
                        <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                            <div
                                aria-hidden
                                className="bg-gradient-to-b to-background absolute inset-0 z-10 from-transparent from-35%"
                            />
                            <div className="inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-5xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1">
                                <DashboardPreview />
                            </div>
                        </div>
                    </AnimatedGroup>
                </div>
            </section>

            {/* Stats strip */}
            <section className="bg-background pb-16 pt-16 md:pb-32">
                <div className="mx-auto max-w-5xl px-6">
                    <p className="text-center text-sm text-gray-500 dark:text-zinc-500 mb-10">Trusted by security-conscious engineering teams</p>
                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                        {[
                            { value: '4 Layers', label: 'Route · API · Security · Performance' },
                            { value: 'OWASP', label: 'Top 10 vulnerability checks' },
                            { value: 'AI Insights', label: 'GPT-powered fix recommendations' },
                            { value: 'Live Deploy', label: 'Sandbox-based test environments' },
                        ].map((stat) => (
                            <div key={stat.value} className="flex flex-col items-center text-center gap-1 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                                <span className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</span>
                                <span className="text-xs text-gray-500 dark:text-zinc-500">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    )
}
