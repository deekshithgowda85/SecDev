/**
 * Centralized Audit & Telemetry Logger
 * Closes #75
 */

export type SeverityLevel = "info" | "warning" | "critical";

export interface AuditEvent {
  id: string;
  timestamp: number;
  action: string;
  severity: SeverityLevel;
  details?: string;
}

export const auditLogger = {
  log: (action: string, severity: SeverityLevel = "info", details?: string) => {
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action,
      severity,
      details,
    };
    
    // In a production environment, this would dispatch to a secure backend API.
    // For now, we standardize the console output format for the sandbox environment.
    const logPrefix = `[AUDIT - ${severity.toUpperCase()}]`;
    if (severity === "critical") console.error(logPrefix, event);
    else if (severity === "warning") console.warn(logPrefix, event);
    else console.info(logPrefix, event);
  }
};