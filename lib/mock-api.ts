export type DeploymentStatus = "success" | "building" | "failed" | "queued" | "cancelled";
export type SeverityLevel = "critical" | "high" | "medium" | "low" | "info";
export type SandboxStatus = "running" | "stopped" | "error";
export type ProjectStatus = "active" | "inactive" | "building";
export type TestStatus = "passed" | "failed" | "skipped";
export type TestType = "security" | "api" | "performance" | "unit";
export type LogLevel = "info" | "warn" | "error" | "debug";
export type LogSource = "build" | "runtime" | "test";
export type EnvEnvironment = "development" | "production" | "preview";

export interface Deployment {
  id: string;
  project: string;
  status: DeploymentStatus;
  branch: string;
  commit: string;
  commitMessage: string;
  url: string;
  createdAt: string;
  duration: string;
  author: string;
}

export interface Project {
  id: string;
  name: string;
  repo: string;
  branch: string;
  lastDeployment: string;
  status: ProjectStatus;
  framework: string;
  deploymentUrl: string;
}

export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  environment: EnvEnvironment;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source: LogSource;
  deploymentId: string;
}

export interface TestResult {
  id: string;
  name: string;
  type: TestType;
  status: TestStatus;
  duration: number;
  details: string;
  timestamp: string;
}

export interface Vulnerability {
  id: string;
  type: string;
  severity: SeverityLevel;
  endpoint: string;
  description: string;
  fix: string;
  cve?: string;
  detectedAt: string;
}

export interface Sandbox {
  id: string;
  project: string;
  status: SandboxStatus;
  cpu: number;
  memory: number;
  uptime: string;
  createdAt: string;
  region: string;
}

export interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  status: number;
  latency: number;
  lastTested: string;
  passed: boolean;
}

export interface PerfMetric {
  route: string;
  lcp: number;
  fcp: number;
  cls: number;
  ttfb: number;
  score: number;
}

// ── Mock data ──────────────────────────────────────────────────────────────

const deployments: Deployment[] = [
  { id: "dep_1a2b3c", project: "SecDev API", status: "success", branch: "main", commit: "a1b2c3d", commitMessage: "feat: add sandbox auto-scaling", url: "https://secdev-api.vercel.app", createdAt: "2026-03-07T10:30:00Z", duration: "1m 24s", author: "deekshith" },
  { id: "dep_2b3c4d", project: "SecDev UI", status: "building", branch: "feat/dashboard", commit: "b2c3d4e", commitMessage: "wip: console dashboard redesign", url: "—", createdAt: "2026-03-07T11:00:00Z", duration: "—", author: "deekshith" },
  { id: "dep_3c4d5e", project: "SecDev Worker", status: "failed", branch: "fix/inngest-timeout", commit: "c3d4e5f", commitMessage: "fix: increase inngest function timeout", url: "—", createdAt: "2026-03-07T09:15:00Z", duration: "0m 47s", author: "deekshith" },
  { id: "dep_4d5e6f", project: "SecDev API", status: "success", branch: "main", commit: "d4e5f6g", commitMessage: "chore: upgrade e2b sdk to v2", url: "https://secdev-api-prev.vercel.app", createdAt: "2026-03-06T18:45:00Z", duration: "2m 01s", author: "deekshith" },
  { id: "dep_5e6f7g", project: "SecDev UI", status: "queued", branch: "main", commit: "e5f6g7h", commitMessage: "fix: theme toggle persistence", url: "—", createdAt: "2026-03-07T11:05:00Z", duration: "—", author: "deekshith" },
  { id: "dep_6f7g8h", project: "SecDev API", status: "success", branch: "main", commit: "f6g7h8i", commitMessage: "perf: cache deployment status", url: "https://secdev-api.vercel.app", createdAt: "2026-03-06T12:00:00Z", duration: "1m 55s", author: "deekshith" },
];

const projects: Project[] = [
  { id: "proj_1", name: "SecDev API", repo: "deekshithgowda85/secdev-api", branch: "main", lastDeployment: "2026-03-07T10:30:00Z", status: "active", framework: "Next.js", deploymentUrl: "https://secdev-api.vercel.app" },
  { id: "proj_2", name: "SecDev UI", repo: "deekshithgowda85/SecDev", branch: "main", lastDeployment: "2026-03-07T11:00:00Z", status: "building", framework: "Next.js", deploymentUrl: "https://secdev-ui.vercel.app" },
  { id: "proj_3", name: "SecDev Worker", repo: "deekshithgowda85/secdev-worker", branch: "main", lastDeployment: "2026-03-07T09:15:00Z", status: "inactive", framework: "Node.js", deploymentUrl: "—" },
];

const envVariables: EnvVariable[] = [
  { id: "env_1", key: "DATABASE_URL", value: "postgresql://••••••••••••@db.neon.tech/secdev", environment: "production", createdAt: "2026-03-01T09:00:00Z" },
  { id: "env_2", key: "NEXT_PUBLIC_API_URL", value: "https://api.secdev.app", environment: "production", createdAt: "2026-03-01T09:00:00Z" },
  { id: "env_3", key: "E2B_API_KEY", value: "e2b_••••••••••••••••", environment: "production", createdAt: "2026-03-02T10:30:00Z" },
  { id: "env_4", key: "INNGEST_SIGNING_KEY", value: "signkey_••••••••", environment: "production", createdAt: "2026-03-02T10:30:00Z" },
  { id: "env_5", key: "DATABASE_URL", value: "postgresql://localhost:5432/secdev_dev", environment: "development", createdAt: "2026-03-01T09:00:00Z" },
  { id: "env_6", key: "NEXT_PUBLIC_API_URL", value: "http://localhost:3000", environment: "development", createdAt: "2026-03-01T09:00:00Z" },
  { id: "env_7", key: "FIREBASE_PROJECT_ID", value: "secdev-prod-••••", environment: "production", createdAt: "2026-03-03T08:00:00Z" },
];

const logs: LogEntry[] = [
  { id: "log_1", timestamp: "2026-03-07T10:31:00Z", level: "info", message: "Build started for deployment dep_1a2b3c", source: "build", deploymentId: "dep_1a2b3c" },
  { id: "log_2", timestamp: "2026-03-07T10:31:15Z", level: "info", message: "Installing dependencies... npm install (312 packages)", source: "build", deploymentId: "dep_1a2b3c" },
  { id: "log_3", timestamp: "2026-03-07T10:32:00Z", level: "info", message: "Next.js build started — compiling 47 modules", source: "build", deploymentId: "dep_1a2b3c" },
  { id: "log_4", timestamp: "2026-03-07T10:32:30Z", level: "warn", message: "Large bundle detected: 512kb > recommended 244kb", source: "build", deploymentId: "dep_1a2b3c" },
  { id: "log_5", timestamp: "2026-03-07T10:33:00Z", level: "info", message: "Build completed successfully in 1m 24s", source: "build", deploymentId: "dep_1a2b3c" },
  { id: "log_6", timestamp: "2026-03-07T10:33:30Z", level: "info", message: "Deployment live at https://secdev-api.vercel.app", source: "runtime", deploymentId: "dep_1a2b3c" },
  { id: "log_7", timestamp: "2026-03-07T09:16:00Z", level: "error", message: "Error: Inngest function timeout after 30s — workflow: deploy-and-test", source: "runtime", deploymentId: "dep_3c4d5e" },
  { id: "log_8", timestamp: "2026-03-07T09:16:01Z", level: "error", message: "Build failed: exit code 1", source: "build", deploymentId: "dep_3c4d5e" },
  { id: "log_9", timestamp: "2026-03-07T10:34:00Z", level: "debug", message: "Health check: GET /api/health → 200 OK (12ms)", source: "runtime", deploymentId: "dep_1a2b3c" },
  { id: "log_10", timestamp: "2026-03-07T10:35:00Z", level: "info", message: "Test run started: 6 tests, 2 suites", source: "test", deploymentId: "dep_1a2b3c" },
];

const testResults: TestResult[] = [
  { id: "test_1", name: "SQL Injection Check", type: "security", status: "passed", duration: 150, details: "No SQL injection vulnerabilities found across 12 endpoints", timestamp: "2026-03-07T10:00:00Z" },
  { id: "test_2", name: "XSS Vulnerability Scan", type: "security", status: "failed", duration: 200, details: "Reflected XSS found in /api/search?q= parameter", timestamp: "2026-03-07T10:00:05Z" },
  { id: "test_3", name: "CSRF Protection", type: "security", status: "passed", duration: 80, details: "CSRF tokens validated on all mutation endpoints", timestamp: "2026-03-07T10:00:10Z" },
  { id: "test_4", name: "GET /api/deployments", type: "api", status: "passed", duration: 89, details: "Response 200, schema valid, 6 items returned", timestamp: "2026-03-07T10:01:00Z" },
  { id: "test_5", name: "POST /api/deploy", type: "api", status: "passed", duration: 342, details: "Response 201, deployment triggered successfully", timestamp: "2026-03-07T10:01:05Z" },
  { id: "test_6", name: "DELETE /api/sandbox/:id", type: "api", status: "passed", duration: 120, details: "Response 204, sandbox destroyed", timestamp: "2026-03-07T10:01:10Z" },
  { id: "test_7", name: "Homepage Load Time", type: "performance", status: "passed", duration: 1240, details: "LCP: 1.2s, FCP: 0.8s, CLS: 0.02 — all within budget", timestamp: "2026-03-07T10:02:00Z" },
  { id: "test_8", name: "API Response P95", type: "performance", status: "failed", duration: 3500, details: "P95 response time 3.5s exceeds 2s threshold", timestamp: "2026-03-07T10:02:05Z" },
  { id: "test_9", name: "Auth Flow E2E", type: "unit", status: "passed", duration: 500, details: "Login, protected route, and logout all pass", timestamp: "2026-03-07T10:03:00Z" },
];

const vulnerabilities: Vulnerability[] = [
  { id: "vuln_1", type: "Cross-Site Scripting (XSS)", severity: "high", endpoint: "/api/search?q=", description: "Reflected XSS via unsanitised query parameter. User input rendered in DOM without encoding.", fix: "Sanitise and HTML-encode all user-supplied values before rendering. Use DOMPurify on the client.", cve: "CVE-2026-0001", detectedAt: "2026-03-07T10:00:05Z" },
  { id: "vuln_2", type: "Missing Security Headers", severity: "medium", endpoint: "/*", description: "Content-Security-Policy header not set. Browser has no policy to block inline scripts.", fix: "Add CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff in next.config.ts headers().", detectedAt: "2026-03-07T10:00:10Z" },
  { id: "vuln_3", type: "Dependency Vulnerability", severity: "critical", endpoint: "node_modules/lodash@4.17.11", description: "Prototype pollution in lodash < 4.17.21 allows attackers to modify Object.prototype.", fix: "Update lodash to ≥ 4.17.21: npm update lodash", cve: "CVE-2021-23337", detectedAt: "2026-03-07T10:00:15Z" },
  { id: "vuln_4", type: "Insecure CORS Policy", severity: "low", endpoint: "/api/*", description: "Access-Control-Allow-Origin: * permits cross-origin requests from any domain.", fix: "Restrict CORS to trusted origins only. Set explicit allowlist in next.config.ts.", detectedAt: "2026-03-07T10:00:20Z" },
  { id: "vuln_5", type: "Sensitive Data Exposure", severity: "high", endpoint: "/api/user/profile", description: "API returns full user object including hashed password and internal IDs.", fix: "Return only the fields required by the client. Strip sensitive fields server-side.", detectedAt: "2026-03-07T10:00:25Z" },
];

const sandboxes: Sandbox[] = [
  { id: "sbx_abc123", project: "SecDev API", status: "running", cpu: 23, memory: 512, uptime: "2h 15m", createdAt: "2026-03-07T08:45:00Z", region: "us-east-1" },
  { id: "sbx_def456", project: "SecDev UI", status: "running", cpu: 8, memory: 256, uptime: "45m", createdAt: "2026-03-07T10:15:00Z", region: "eu-west-1" },
  { id: "sbx_ghi789", project: "SecDev Worker", status: "stopped", cpu: 0, memory: 0, uptime: "—", createdAt: "2026-03-07T07:00:00Z", region: "us-east-1" },
  { id: "sbx_jkl012", project: "SecDev API", status: "error", cpu: 0, memory: 128, uptime: "—", createdAt: "2026-03-07T09:00:00Z", region: "us-east-1" },
];

const apiEndpoints: ApiEndpoint[] = [
  { id: "api_1", method: "GET", path: "/api/health", status: 200, latency: 12, lastTested: "2026-03-07T10:35:00Z", passed: true },
  { id: "api_2", method: "GET", path: "/api/deployments", status: 200, latency: 89, lastTested: "2026-03-07T10:35:05Z", passed: true },
  { id: "api_3", method: "POST", path: "/api/deploy", status: 201, latency: 342, lastTested: "2026-03-07T10:35:10Z", passed: true },
  { id: "api_4", method: "GET", path: "/api/user/profile", status: 200, latency: 45, lastTested: "2026-03-07T10:35:15Z", passed: true },
  { id: "api_5", method: "DELETE", path: "/api/sandbox/:id", status: 204, latency: 120, lastTested: "2026-03-07T10:35:20Z", passed: true },
  { id: "api_6", method: "POST", path: "/api/env-vars", status: 201, latency: 67, lastTested: "2026-03-07T10:35:25Z", passed: true },
  { id: "api_7", method: "GET", path: "/api/logs", status: 500, latency: 2300, lastTested: "2026-03-07T10:35:30Z", passed: false },
  { id: "api_8", method: "POST", path: "/api/auth/login", status: 200, latency: 230, lastTested: "2026-03-07T10:35:35Z", passed: true },
];

const perfMetrics: PerfMetric[] = [
  { route: "/", lcp: 1.2, fcp: 0.8, cls: 0.02, ttfb: 0.1, score: 94 },
  { route: "/console/dashboard", lcp: 1.8, fcp: 1.1, cls: 0.05, ttfb: 0.2, score: 87 },
  { route: "/console/deployments", lcp: 2.1, fcp: 1.3, cls: 0.03, ttfb: 0.3, score: 82 },
  { route: "/console/logs", lcp: 2.8, fcp: 1.6, cls: 0.01, ttfb: 0.4, score: 71 },
  { route: "/login", lcp: 0.9, fcp: 0.6, cls: 0.01, ttfb: 0.08, score: 97 },
];

// ── API functions ──────────────────────────────────────────────────────────

export function getDeployments(): Deployment[] { return deployments; }
export function getProjects(): Project[] { return projects; }
export function getEnvVariables(): EnvVariable[] { return envVariables; }
export function getLogs(): LogEntry[] { return logs; }
export function getTestResults(): TestResult[] { return testResults; }
export function getVulnerabilities(): Vulnerability[] { return vulnerabilities; }
export function getSandboxes(): Sandbox[] { return sandboxes; }
export function getApiEndpoints(): ApiEndpoint[] { return apiEndpoints; }
export function getPerfMetrics(): PerfMetric[] { return perfMetrics; }

export function getDashboardStats() {
  return {
    totalDeployments: deployments.length,
    successfulDeployments: deployments.filter((d) => d.status === "success").length,
    activeSandboxes: sandboxes.filter((s) => s.status === "running").length,
    totalSandboxes: sandboxes.length,
    testsPassed: testResults.filter((t) => t.status === "passed").length,
    testsFailed: testResults.filter((t) => t.status === "failed").length,
    securityScore: 74,
    criticalVulnerabilities: vulnerabilities.filter((v) => v.severity === "critical").length,
    highVulnerabilities: vulnerabilities.filter((v) => v.severity === "high").length,
  };
}
