/**
 * Brevo (Sendinblue) transactional email configuration.
 *
 * Required env vars:
 *   BREVO_API_KEY  — Brevo API key (v3)
 *   EMAIL_FROM     — Sender email, e.g. "noreply@secdev.app"
 *   APP_URL        — Public app URL, e.g. "https://secdev.app"
 */

export const brevoConfig = {
  apiUrl: "https://api.brevo.com/v3/smtp/email",

  get apiKey(): string {
    const key = process.env.BREVO_API_KEY;
    if (!key) throw new Error("BREVO_API_KEY env var is not set");
    return key;
  },

  get senderEmail(): string {
    return process.env.EMAIL_FROM ?? "noreply@secdev.app";
  },

  get senderName(): string {
    return "SecDev";
  },

  get appUrl(): string {
    return process.env.APP_URL ?? "https://secdev.app";
  },
} as const;
