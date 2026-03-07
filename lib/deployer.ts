import { Sandbox } from "e2b";
import { getDb, ensureTables } from "./db";

// Custom template: Node 20 + git + pnpm + serve pre-installed (qg1v6gyvxew6q52r04lp)
const E2B_TEMPLATE = process.env.E2B_TEMPLATE ?? "secdev-web-runtime";
const SANDBOX_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LogLine {
  ts: number;
  level: "info" | "error" | "warn";
  msg: string;
}

export interface DeploymentRecord {
  sandboxId: string;
  repoUrl: string;
  repoName: string;
  branch: string;
  publicUrl: string;
  logsUrl: string;
  status: "deploying" | "live" | "failed";
  startedAt: number;
  /** Full log lines — populated by getDeployment(), empty in getAllDeployments() */
  logs: LogLine[];
  /** Pre-calculated count — populated by getAllDeployments(), undefined in getDeployment() */
  logCount?: number;
}

export interface DeploymentResult {
  id: string;
  publicUrl: string;
  logsUrl: string;
  sandboxId: string;
  status: string;
}

// ── DB-backed store accessors ──────────────────────────────────────────────────

/** Fetch a single deployment with full logs from the database. */
export async function getDeployment(id: string): Promise<DeploymentRecord | null> {
  await ensureTables();
  const sql = getDb();
  const rows = await sql`SELECT * FROM deployments WHERE sandbox_id = ${id}`;
  if (!rows.length) return null;
  const row = rows[0];
  const logRows = await sql`
    SELECT ts, level, msg FROM deployment_logs
    WHERE sandbox_id = ${id}
    ORDER BY id ASC
  `;
  return {
    sandboxId: row.sandbox_id as string,
    repoUrl: row.repo_url as string,
    repoName: row.repo_name as string,
    branch: row.branch as string,
    publicUrl: row.public_url as string,
    logsUrl: row.logs_url as string,
    status: row.status as DeploymentRecord["status"],
    startedAt: Number(row.started_at),
    logs: logRows.map((r) => ({
      ts: Number(r.ts),
      level: r.level as LogLine["level"],
      msg: r.msg as string,
    })),
  };
}

/** Fetch all deployments (no logs, but includes logCount). Newest first. */
export async function getAllDeployments(): Promise<DeploymentRecord[]> {
  await ensureTables();
  const sql = getDb();
  const rows = await sql`
    SELECT
      d.*,
      COUNT(l.id)::int AS log_count
    FROM deployments d
    LEFT JOIN deployment_logs l ON l.sandbox_id = d.sandbox_id
    GROUP BY d.sandbox_id
    ORDER BY d.started_at DESC
  `;
  return rows.map((row) => ({
    sandboxId: row.sandbox_id as string,
    repoUrl: row.repo_url as string,
    repoName: row.repo_name as string,
    branch: row.branch as string,
    publicUrl: row.public_url as string,
    logsUrl: row.logs_url as string,
    status: row.status as DeploymentRecord["status"],
    startedAt: Number(row.started_at),
    logs: [],
    logCount: Number(row.log_count),
  }));
}

/** Delete a deployment record and all its logs from the database. */
export async function deleteDeployment(id: string): Promise<void> {
  await ensureTables();
  const sql = getDb();
  await sql`DELETE FROM deployment_logs WHERE sandbox_id = ${id}`;
  await sql`DELETE FROM deployments WHERE sandbox_id = ${id}`;
}

// ── Main deploy entry point ────────────────────────────────────────────────────

export async function startDeployment(
  repoUrl: string,
  options?: {
    branch?: string;
    envVars?: Record<string, string>;
    repoName?: string;
  }
): Promise<DeploymentResult> {
  const branch = options?.branch ?? "main";
  const repoName =
    options?.repoName ??
    repoUrl.split("/").pop()?.replace(/\.git$/, "") ??
    "app";

  // Create the sandbox (takes ~3s). We await this so we can return a real URL immediately.
  const sandbox = await Sandbox.create(E2B_TEMPLATE, {
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: SANDBOX_TIMEOUT_MS,
    metadata: {
      repoUrl,
      branch,
      repoName,
      createdAt: new Date().toISOString(),
    },
  });

  const sandboxId = sandbox.sandboxId;
  const publicUrl = `https://${sandbox.getHost(3000)}`;
  const logsUrl = `/console/deployments/${sandboxId}`;

  // Persist the deployment record to the database
  await ensureTables();
  const sql = getDb();
  await sql`
    INSERT INTO deployments (sandbox_id, repo_url, repo_name, branch, public_url, logs_url, status, started_at)
    VALUES (${sandboxId}, ${repoUrl}, ${repoName}, ${branch}, ${publicUrl}, ${logsUrl}, 'deploying', ${Date.now()})
    ON CONFLICT (sandbox_id) DO NOTHING
  `;

  // Fire-and-forget background deployment pipeline
  runDeploymentPipeline(sandbox, sandboxId, repoName, publicUrl, repoUrl, branch, options?.envVars)
    .catch(async (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      const ts = Date.now();
      const db = getDb();
      db`INSERT INTO deployment_logs (sandbox_id, ts, level, msg) VALUES (${sandboxId}, ${ts}, 'error', ${`Fatal: ${msg}`})`.catch(() => null);
      db`UPDATE deployments SET status = 'failed' WHERE sandbox_id = ${sandboxId}`.catch(() => null);
    });

  return { id: sandboxId, publicUrl, logsUrl, sandboxId, status: "deploying" };
}

// ── Background pipeline ────────────────────────────────────────────────────────

async function runDeploymentPipeline(
  sandbox: Sandbox,
  sandboxId: string,
  repoName: string,
  publicUrl: string,
  repoUrl: string,
  branch: string,
  envVars?: Record<string, string>
): Promise<void> {
  const sql = getDb();

  // Fire-and-forget DB insert for a log line (never blocks the pipeline)
  const log = (msg: string, level: LogLine["level"] = "info") => {
    const ts = Date.now();
    sql`INSERT INTO deployment_logs (sandbox_id, ts, level, msg) VALUES (${sandboxId}, ${ts}, ${level}, ${msg})`
      .catch(() => null);
  };

  // Awaited status update
  const setStatus = (status: string) =>
    sql`UPDATE deployments SET status = ${status} WHERE sandbox_id = ${sandboxId}`;

  // Capture streaming stdout/stderr into log store
  const onStdout = (d: string) => {
    for (const line of d.split("\n")) {
      if (line.trim()) log(line.trimEnd());
    }
  };
  const onStderr = (d: string) => {
    for (const line of d.split("\n")) {
      if (line.trim()) log(line.trimEnd(), "error");
    }
  };

  log(`🚀 Sandbox ready  [${sandboxId}]`);
  log(`📦 Deploying ${repoName}  branch: ${branch}`);

  // pnpm and serve are already baked into the secdev-web-runtime image.

  // ── Step 2: Clone repo ────────────────────────────────────────────────────
  log(`📥 Cloning ${repoUrl} (branch: ${branch})…`);
  const cloneResult = await sandbox.commands.run(
    `git clone --depth 1 --branch ${branch} ${repoUrl} /home/user/repo 2>&1`,
    { onStdout, onStderr, timeoutMs: 120_000 }
  );

  if (cloneResult.exitCode !== 0) {
    log(`❌ git clone failed (exit ${cloneResult.exitCode})`, "error");
    await setStatus("failed");
    await sandbox.kill().catch(() => null);
    return;
  }
  log(`✅ Clone complete`);

  // ── Step 3: Detect package manager ───────────────────────────────────────
  log(`🔍 Detecting project type…`);
  const lsResult = await sandbox.commands.run("ls /home/user/repo 2>&1", {
    timeoutMs: 10_000,
  });
  log(`   Files: ${lsResult.stdout.trim().replace(/\n/g, ", ")}`);

  const hasPnpmLock = lsResult.stdout.includes("pnpm-lock.yaml");
  const hasYarnLock = lsResult.stdout.includes("yarn.lock");
  const hasPackageJson = lsResult.stdout.includes("package.json");
  const pkgMgr = hasPnpmLock ? "pnpm" : hasYarnLock ? "yarn" : "npm";
  log(`   Package manager: ${pkgMgr}`);

  // ── Step 4: Install dependencies ─────────────────────────────────────────
  if (hasPackageJson) {
    log(`📦 Installing dependencies (${pkgMgr} install)…`);

    // Build env vars string for injection
    const envStr = envVars
      ? Object.entries(envVars)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(" ")
      : "";

    const installCmd = `cd /home/user/repo && ${envStr} ${pkgMgr} install 2>&1`;
    const installResult = await sandbox.commands.run(installCmd, {
      onStdout,
      onStderr,
      timeoutMs: 300_000,
    });

    if (installResult.exitCode !== 0) {
      log(`❌ Dependency install failed`, "error");
      await setStatus("failed");
      return;
    }
    log(`✅ Dependencies installed`);
  }

  // ── Step 5: Detect framework and build ───────────────────────────────────
  let startCmd: string;
  const pkgJson = await sandbox.commands.run(
    "cat /home/user/repo/package.json 2>/dev/null || echo '{}'",
    { timeoutMs: 5_000 }
  );
  const pkgContent = pkgJson.stdout;
  const hasNextConfig =
    lsResult.stdout.includes("next.config") ||
    pkgContent.includes('"next"') ||
    pkgContent.includes("\"next\"");
  const hasVite = pkgContent.includes('"vite"');
  const hasCra = pkgContent.includes('"react-scripts"');

  if (hasNextConfig) {
    // ⚠️  next build needs 1.5-2 GB RAM — sandbox only has 1 GB.
    // We run `next dev` instead: no build step, starts in ~10s, uses ~400 MB.
    log(`🔍 Detected: Next.js`);
    log(`ℹ️  Using dev-server mode to avoid OOM (next build needs 1.5 GB+)`);
    // Disable telemetry so it doesn't slow down startup
    await sandbox.commands.run(
      `cd /home/user/repo && npx next telemetry disable 2>/dev/null || true`,
      { timeoutMs: 10_000 }
    );
    startCmd = `cd /home/user/repo && NODE_OPTIONS='--max-old-space-size=512' PORT=3000 npx next dev -p 3000`;
  } else if (hasVite || hasCra) {
    // Vite build is much lighter (~400 MB). Cap memory just in case.
    log(`🔍 Detected: ${hasVite ? "Vite" : "Create React App"}`);
    log(`🔨 Building…`);
    const buildResult = await sandbox.commands.run(
      `cd /home/user/repo && NODE_OPTIONS='--max-old-space-size=512' ${pkgMgr} run build 2>&1`,
      { onStdout, onStderr, timeoutMs: 300_000 }
    );
    if (buildResult.exitCode !== 0) {
      log(`❌ Build failed`, "error");
      await setStatus("failed");
      return;
    }
    // Detect output directory AFTER the build (dist/ is gitignored, won't appear in pre-build ls)
    const distCheckResult = await sandbox.commands.run(
      `[ -d /home/user/repo/dist ] && echo dist || ([ -d /home/user/repo/build ] && echo build || echo dist)`,
      { timeoutMs: 5_000 }
    );
    const distDir = distCheckResult.stdout.trim() || "dist";
    log(`   Output directory: ${distDir}/`);
    startCmd = `serve -s /home/user/repo/${distDir} -l 3000`;
  } else if (hasPackageJson && pkgContent.includes('"start"')) {
    log(`🔍 Detected: Node.js app`);
    startCmd = `cd /home/user/repo && PORT=3000 ${pkgMgr} start`;
  } else {
    log(`🔍 Detected: Static HTML`);
    startCmd = `serve -s /home/user/repo -l 3000`;
  }

  // ── Step 6: Start server (background, non-blocking) ───────────────────────
  log(`🌐 Starting server on port 3000…`);
  // Base64-encode the start script so we can write it with a single-quoted
  // echo — this sidesteps ALL shell-quoting issues (single quotes in
  // NODE_OPTIONS, double quotes in paths, etc.).
  const scriptContent = `#!/bin/bash\n${startCmd} >> /tmp/server.log 2>&1\n`;
  const scriptB64 = Buffer.from(scriptContent).toString("base64");
  const writeResult = await sandbox.commands.run(
    `echo '${scriptB64}' | base64 -d > /tmp/secdev-start.sh && chmod +x /tmp/secdev-start.sh`,
    { timeoutMs: 10_000 }
  );
  if (writeResult.exitCode !== 0) {
    log(`❌ Failed to write start script (exit ${writeResult.exitCode})`, "error");
    await setStatus("failed");
    return;
  }
  const launchResult = await sandbox.commands.run(
    `nohup /tmp/secdev-start.sh > /dev/null 2>&1 & echo "PID=$!"`,
    { timeoutMs: 12_000 }
  );
  log(`   Server process launched (${launchResult.stdout.trim()})`);

  // next dev takes ~15s for first compile; Vite/Express start in ~3s
  const isNextDev = startCmd.includes("next dev");
  const bootWaitMs = isNextDev ? 18_000 : 6_000;
  log(`⏳ Waiting ${bootWaitMs / 1000}s for server to boot…`);
  await new Promise((r) => setTimeout(r, bootWaitMs));

  // Check if port is up
  const portCheck = await sandbox.commands.run(
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>&1 || echo 'unreachable'",
    { timeoutMs: 30_000 }
  );
  const httpCode = portCheck.stdout.trim();
  const codeNum = parseInt(httpCode, 10);
  const isHealthy = codeNum >= 200 && codeNum < 400;

  // Always dump server log if something looks wrong
  if (httpCode === "unreachable" || httpCode === "" || !isHealthy) {
    const srvLog = await sandbox.commands.run("tail -30 /tmp/server.log 2>&1", {
      timeoutMs: 5_000,
    });
    if (httpCode === "unreachable" || httpCode === "") {
      log(`⚠️  Server did not respond — server log:\n${srvLog.stdout}`, "warn");
      await setStatus("failed");
      return;
    } else {
      // Server is up but returned an error (e.g. 404). Log it but keep going —
      // some frameworks redirect / to /login (3xx caught above, 4xx is suspicious).
      log(`⚠️  Server returned HTTP ${httpCode}. Server log:\n${srvLog.stdout}`, "warn");
    }
  } else {
    log(`✅ Server responding (HTTP ${httpCode})`);
  }

  await setStatus("live");
  log(`🎉 Deployment LIVE → ${publicUrl}`);
}

// ── Sandbox management ─────────────────────────────────────────────────────────

export async function killSandbox(sandboxId: string): Promise<void> {
  // Sandbox may already be dead (timed out) — swallow the connect error
  try {
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: process.env.E2B_API_KEY,
    });
    await sandbox.kill();
  } catch { /* already dead — that's fine, just mark failed below */ }
  await ensureTables();
  const sql = getDb();
  await sql`UPDATE deployments SET status = 'failed' WHERE sandbox_id = ${sandboxId}`;
}

/**
 * Try to connect to the sandbox and ping its server.
 * Updates the DB status and returns the new status.
 * Used to detect E2B's 30-minute auto-shutdown.
 */
export async function refreshSandboxStatus(
  sandboxId: string
): Promise<"live" | "failed"> {
  await ensureTables();
  const sql = getDb();
  try {
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: process.env.E2B_API_KEY,
    });
    // Quick HTTP ping inside the sandbox
    const result = await sandbox.commands.run(
      `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>&1 || echo unreachable`,
      { timeoutMs: 15_000 }
    );
    const code = result.stdout.trim();
    if (!code || code === "unreachable" || code === "000") {
      await sql`UPDATE deployments SET status = 'failed' WHERE sandbox_id = ${sandboxId}`;
      return "failed";
    }
    // Anything that got a response means the sandbox is alive
    return "live";
  } catch {
    // connect() threw — sandbox has timed out / been killed
    await sql`UPDATE deployments SET status = 'failed' WHERE sandbox_id = ${sandboxId}`;
    return "failed";
  }
}

