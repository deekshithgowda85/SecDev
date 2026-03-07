import { getPerfMetrics } from "@/lib/mock-api";
import { Gauge, TrendingUp, TrendingDown } from "lucide-react";

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 90 ? "text-green-600 dark:text-green-400" : score >= 70 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";
  return (
    <div className={`text-2xl font-bold ${color}`}>{score}</div>
  );
}

function Metric({ label, value, unit, good }: { label: string; value: number; unit: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500 dark:text-zinc-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
          {value}{unit}
        </span>
        {good
          ? <TrendingDown className="w-3.5 h-3.5 text-green-500" />
          : <TrendingUp   className="w-3.5 h-3.5 text-red-500" />
        }
      </div>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? "bg-green-500" : score >= 70 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
    </div>
  );
}

export default function PerformancePage() {
  const metrics = getPerfMetrics();
  const avgScore = Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Testing</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">Web Vitals and response time metrics across all routes</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Gauge className="w-4 h-4" /> Run Audit
        </button>
      </div>

      {/* Overall score */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center gap-1 md:col-span-1">
          <p className="text-xs text-gray-500 dark:text-zinc-500 uppercase tracking-wider font-semibold">Avg Score</p>
          <ScoreCircle score={avgScore} />
          <ScoreBar score={avgScore} />
        </div>
        {[
          { label: "LCP Target", sub: "< 2.5s", tip: "Largest Contentful Paint" },
          { label: "FCP Target", sub: "< 1.8s", tip: "First Contentful Paint" },
          { label: "CLS Target", sub: "< 0.1",  tip: "Cumulative Layout Shift" },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">{card.label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{card.sub}</p>
            <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">{card.tip}</p>
          </div>
        ))}
      </div>

      {/* Per-route metrics */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Route Performance</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {metrics.map((m) => (
            <div key={m.route} className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <code className="text-sm font-mono text-gray-800 dark:text-zinc-200">{m.route}</code>
                <div className="flex items-center gap-2">
                  <ScoreCircle score={m.score} />
                  <span className="text-xs text-gray-400 dark:text-zinc-500">/100</span>
                </div>
              </div>
              <ScoreBar score={m.score} />
              <div className="grid grid-cols-4 gap-3 mt-3">
                <Metric label="LCP"  value={m.lcp}  unit="s"  good={m.lcp  < 2.5} />
                <Metric label="FCP"  value={m.fcp}  unit="s"  good={m.fcp  < 1.8} />
                <Metric label="CLS"  value={m.cls}  unit=""   good={m.cls  < 0.1} />
                <Metric label="TTFB" value={m.ttfb} unit="s"  good={m.ttfb < 0.6} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Recommendations</h2>
        <div className="space-y-3">
          {[
            { title: "Enable Next.js Image Optimization", desc: "Use next/image for all images to reduce LCP. Detected unoptimized images on /console/logs.", impact: "High" },
            { title: "Add route-level code splitting", desc: "Review /console/deployments bundle — 512kb exceeds recommended 244kb.", impact: "Medium" },
            { title: "Enable API response caching", desc: "GET /api/logs returns 2.3s — add Cache-Control headers or Redis caching.", impact: "High" },
            { title: "Reduce unused JavaScript", desc: "Remove unused dependencies to reduce initial bundle by an estimated 80kb.", impact: "Low" },
          ].map((r) => (
            <div key={r.title} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
              <span className={`mt-0.5 px-2 py-0.5 text-xs font-semibold rounded shrink-0 ${
                r.impact === "High" ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                : r.impact === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
                : "bg-gray-200 text-gray-600 dark:bg-zinc-700 dark:text-zinc-400"
              }`}>{r.impact}</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{r.title}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
