import { Sandbox } from "e2b";

const E2B_TEMPLATE = process.env.E2B_TEMPLATE ?? "base";
const SANDBOX_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

export interface DeploymentResult {
  id: string;
  publicUrl: string;
  logsUrl: string;
  sandboxId: string;
  status: "started" | "error";
}

export async function startDeployment(
  repoUrl: string,
  options?: { branch?: string }
): Promise<DeploymentResult> {
  const branch = options?.branch ?? "main";

  const sandbox = await Sandbox.create(E2B_TEMPLATE, {
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: SANDBOX_TIMEOUT_MS,
    envs: {
      REPO_URL: repoUrl,
      BRANCH: branch,
    },
    metadata: {
      repoUrl,
      branch,
      createdAt: new Date().toISOString(),
    },
  });

  // Clone and set up the project inside the sandbox
  const cloneResult = await sandbox.commands.run(
    `git clone --depth 1 --branch ${branch} ${repoUrl} /home/user/app/repo`,
    { timeoutMs: 120_000 }
  );

  if (cloneResult.exitCode !== 0) {
    await sandbox.kill();
    throw new Error(`Git clone failed: ${cloneResult.stderr}`);
  }

  // Detect package manager and install deps
  const installScript = `
    cd /home/user/app/repo
    if [ -f "pnpm-lock.yaml" ]; then
      npm install -g pnpm && pnpm install
    elif [ -f "yarn.lock" ]; then
      npm install -g yarn && yarn install
    else
      npm install
    fi
  `;
  await sandbox.commands.run(installScript, { timeoutMs: 180_000 });

  // Detect framework, build, and start the server in background
  const startScript = `
    cd /home/user/app/repo
    if [ -f "next.config.js" ] || [ -f "next.config.ts" ] || [ -f "next.config.mjs" ]; then
      npm run build && PORT=3000 npm run start &
    elif grep -q '"vite"' package.json 2>/dev/null; then
      npm run build && npx serve -s dist -l 3000 &
    elif grep -q '"react-scripts"' package.json 2>/dev/null; then
      npm run build && npx serve -s build -l 3000 &
    elif [ -f "index.html" ]; then
      npx serve -s . -l 3000 &
    elif grep -q '"start"' package.json 2>/dev/null; then
      PORT=3000 npm run start &
    else
      npx serve -s . -l 3000 &
    fi
  `;
  await sandbox.commands.run(startScript, { timeoutMs: 180_000 });

  const host = sandbox.getHost(3000);
  const publicUrl = `https://${host}`;

  return {
    id: sandbox.sandboxId,
    publicUrl,
    logsUrl: `/console/deployments/${sandbox.sandboxId}`,
    sandboxId: sandbox.sandboxId,
    status: "started",
  };
}

export async function listSandboxes() {
  const paginator = Sandbox.list({ apiKey: process.env.E2B_API_KEY });
  const sandboxes: Array<{
    sandboxId: string;
    templateId: string;
    name?: string;
    metadata: Record<string, string>;
    startedAt: Date;
  }> = [];

  while (paginator.hasNext) {
    const page = await paginator.nextItems();
    for (const sb of page) {
      sandboxes.push({
        sandboxId: sb.sandboxId,
        templateId: sb.templateId,
        name: sb.name,
        metadata: sb.metadata,
        startedAt: sb.startedAt,
      });
    }
  }

  return sandboxes;
}

export async function killSandbox(sandboxId: string): Promise<void> {
  const sandbox = await Sandbox.connect(sandboxId, {
    apiKey: process.env.E2B_API_KEY,
  });
  await sandbox.kill();
}
