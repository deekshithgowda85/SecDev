"use client";

import { Activity, ShieldAlert, AlertTriangle, Info, Clock } from "lucide-react";
import type { AuditEvent, SeverityLevel } from "@/lib/utils/auditLogger"; // Adjust import path if needed

// Mock Data for the UI demonstration
const MOCK_LOGS: AuditEvent[] = [
  { id: "1", timestamp: Date.now() - 1000 * 60 * 5, action: "Sandbox e2b-node-xyz Terminated", severity: "info", details: "User requested manual teardown." },
  { id: "2", timestamp: Date.now() - 1000 * 60 * 45, action: "Groq API Key Modified", severity: "warning", details: "Key visibility toggled and saved." },
  { id: "3", timestamp: Date.now() - 1000 * 60 * 60 * 2, action: "Failed Deployment: nextjs-template", severity: "critical", details: "Build timeout exceeded 300s." },
];

const SEVERITY_CONFIG: Record<SeverityLevel, { icon: React.ComponentType<{ className?: string }>, styles: string }> = {
  info: { icon: Info, styles: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  warning: { icon: AlertTriangle, styles: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
  critical: { icon: ShieldAlert, styles: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
};

export default function AuditLogsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-500" /> System Audit Logs
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Review historical telemetry, infrastructure events, and security access trails.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
            <thead className="bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-300 border-b border-gray-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Severity</th>
                <th className="px-4 py-3 font-semibold">Action Event</th>
                <th className="px-4 py-3 font-semibold">Additional Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {MOCK_LOGS.map((log) => {
                const Config = SEVERITY_CONFIG[log.severity];
                const Icon = Config.icon;
                return (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap flex items-center gap-2 font-mono text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${Config.styles}`}>
                        <Icon className="w-3 h-3" />
                        {log.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-zinc-200">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-500 truncate max-w-xs">
                      {log.details || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}