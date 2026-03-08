/**
 * Brevo transactional email service with retry logic and structured logging.
 *
 * Usage:
 *   import { sendEmail } from "@/lib/email/mail-service";
 *   await sendEmail("user@example.com", "Subject", "<h1>Hello</h1>");
 */

import { brevoConfig } from "./brevo";

/* ── types ─────────────────────────────────────────────────────────────── */

interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/* ── helpers ───────────────────────────────────────────────────────────── */

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Basic email format validation (RFC 5322 simplified). */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    service: "email",
    level,
    message,
    ...meta,
  };
  if (level === "error") console.error(JSON.stringify(entry));
  else if (level === "warn") console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

/* ── rate limiter (in-memory, per-process) ─────────────────────────────── */

const rateBucket = { count: 0, resetAt: 0 };
const RATE_LIMIT = 50;          // emails per window
const RATE_WINDOW_MS = 60_000;  // 1 minute

function checkRateLimit(): boolean {
  const now = Date.now();
  if (now > rateBucket.resetAt) {
    rateBucket.count = 0;
    rateBucket.resetAt = now + RATE_WINDOW_MS;
  }
  if (rateBucket.count >= RATE_LIMIT) return false;
  rateBucket.count++;
  return true;
}

/* ── core send function ────────────────────────────────────────────────── */

/**
 * Send an email via Brevo transactional API.
 *
 * @param to      Recipient email address.
 * @param subject Email subject line.
 * @param html    HTML email body.
 * @returns       Result with `ok` flag and optional `messageId` or `error`.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  // Input validation
  if (!to || !isValidEmail(to)) {
    log("warn", "Invalid recipient email", { to });
    return { ok: false, error: "Invalid recipient email address" };
  }
  if (!subject.trim()) {
    return { ok: false, error: "Subject is required" };
  }

  // Rate-limit check
  if (!checkRateLimit()) {
    log("warn", "Email rate limit exceeded", { to, subject });
    return { ok: false, error: "Rate limit exceeded — try again shortly" };
  }

  const body = JSON.stringify({
    sender: {
      name: brevoConfig.senderName,
      email: brevoConfig.senderEmail,
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  });

  let lastError = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(brevoConfig.apiUrl, {
        method: "POST",
        headers: {
          "api-key": brevoConfig.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body,
        signal: AbortSignal.timeout(15_000),
      });

      if (res.ok) {
        const data = (await res.json()) as { messageId?: string };
        log("info", "Email sent", { to, subject, messageId: data.messageId, attempt });
        return { ok: true, messageId: data.messageId };
      }

      // Non-retryable client errors (4xx except 429)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        const errBody = await res.text();
        log("error", "Brevo rejected email (non-retryable)", { status: res.status, body: errBody, to });
        return { ok: false, error: `Brevo error ${res.status}` };
      }

      lastError = `HTTP ${res.status}`;
      log("warn", `Email attempt ${attempt}/${MAX_RETRIES} failed`, { status: res.status, to });
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      log("warn", `Email attempt ${attempt}/${MAX_RETRIES} threw`, { error: lastError, to });
    }

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  log("error", "Email send failed after retries", { to, subject, error: lastError });
  return { ok: false, error: `Failed after ${MAX_RETRIES} retries: ${lastError}` };
}
