/**
 * Re-exports for the email service barrel.
 */

export { brevoConfig } from "./brevo";
export { sendEmail } from "./mail-service";
export {
  scanStartedHtml,
  vulnerabilityDetectedHtml,
  scanCompletedHtml,
  criticalAlertHtml,
} from "./templates";
export type {
  ScanStartedParams,
  VulnerabilityDetectedParams,
  ScanCompletedParams,
  CriticalAlertParams,
} from "./templates";
