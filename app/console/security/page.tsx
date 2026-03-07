import { getVulnerabilities } from "@/lib/mock-api";
import type { SeverityLevel } from "@/lib/mock-api";
import { Shield, AlertTriangle, AlertCircle, Info, Check, ExternalLink } from "lucide-react";

const SEVERITY_CFG: Record<SeverityLevel, { cls: string; icon: React.ReactNode; order: number }> = {
  critical: { cls: "bg-red-50    text-red-800    border-red-300    dark:bg-red-500/10    dark:text-red-400    dark:border-red-500/30",    icon: <AlertCircle   className="w-3.5 h-3.5" />, order: 0 },
  high:     { cls: "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30", icon: <AlertTriangle className="w-3.5 h-3.5" />, order: 1 },
  medium:   { cls: "bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30", icon: <AlertTriangle className="w-3.5 h-3.5" />, order: 2 },
  low:      { cls: "bg-blue-50   text-blue-800   border-blue-300   dark:bg-blue-500/10   dark:text-blue-400   dark:border-blue-500/30",   icon: <Info          className="w-3.5 h-3.5" />, order: 3 },
  info:     { cls: "bg-gray-100  text-gray-700   border-gray-200   dark:bg-zinc-800     dark:text-zinc-400   dark:border-zinc-700",       icon: <Info          className="w-3.5 h-3.5" />, order: 4 },
};

function SeverityBadge({ severity }: { severity: SeverityLevel }) {
  const { cls, icon } = SEVERITY_CFG[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${cls}`}>
      {icon}{severity}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SecurityPage() {
  const vulns = getVulnerabilities().sort((a, b) => SEVERITY_CFG[a.severity].order - SEVERITY_CFG[b.severity].order);
  const critical = vulns.filter((v) => v.severity === "critical").length;
  const high     = vulns.filter((v) => v.severity === "high").length;
  const medium   = vulns.filter((v) => v.severity === "medium").length;
  const low      = vulns.filter((v) => v.severity === "low").length;
  const score    = 74;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Scans</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">{vulns.length} vulnerabilities detected · Last scanned 10 minutes ago</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Shield className="w-4 h-4" /> Run Scan
        </button>
      </div>

      {/* Score + summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="col-span-2 md:col-span-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center">
          <div className={`text-4xl font-bold mb-1 ${score >= 80 ? "text-green-600 dark:text-green-400" : score >= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
            {score}
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-500 text-center">Security Score</p>
          <div className="mt-3 w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
          </div>
        </div>
        {([ ["critical", critical, "text-red-600 dark:text-red-400"], ["high", high, "text-orange-600 dark:text-orange-400"], ["medium", medium, "text-yellow-600 dark:text-yellow-400"], ["low", low, "text-blue-600 dark:text-blue-400"] ] as [string, number, string][]).map(([label, count, cls]) => (
          <div key={label} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center">
            <p className={`text-3xl font-bold ${cls}`}>{count}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500 capitalize mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Vulnerabilities */}
      <div className="space-y-3">
        {vulns.map((v) => (
          <div key={v.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <SeverityBadge severity={v.severity} />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{v.type}</h3>
                {v.cve && (
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-xs font-mono rounded">{v.cve}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-zinc-500 shrink-0">{fmt(v.detectedAt)}</p>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2 text-xs">
                <span className="text-gray-500 dark:text-zinc-500 font-semibold shrink-0 w-20">Endpoint</span>
                <code className="text-gray-700 dark:text-zinc-300 font-mono">{v.endpoint}</code>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="text-gray-500 dark:text-zinc-500 font-semibold shrink-0 w-20">Description</span>
                <p className="text-gray-700 dark:text-zinc-300">{v.description}</p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="text-gray-500 dark:text-zinc-500 font-semibold shrink-0 w-20">Fix</span>
                <p className="text-gray-700 dark:text-zinc-300">{v.fix}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800">
              <button className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                <Check className="w-3.5 h-3.5" /> Mark as resolved
              </button>
              {v.cve && (
                <a
                  href={`https://nvd.nist.gov/vuln/detail/${v.cve}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500 hover:text-indigo-500 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> NVD
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
