# SecDev - Autonomous Cloud Deployment & Security Platform

<div align="center">

**Deploy & Test in Sandboxes**

*A self-learning, self-adaptive security-first deployment platform that reduces human intervention in monitoring, detection, and response.*

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![E2B](https://img.shields.io/badge/E2B-Sandboxes-green)](https://e2b.dev/)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-purple)](https://neon.tech/)

</div>

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [The Problem We Solve](#-the-problem-we-solve)
- [Autonomous Security Systems](#-autonomous-security-systems)
- [Architecture Deep Dive](#-architecture-deep-dive)
- [Tech Stack](#-tech-stack)
- [Core Features](#-core-features)
- [E2B Sandboxes Explained](#-e2b-sandboxes-explained)
- [Inngest Workflow System](#-inngest-workflow-system)
- [Deployment Pipeline](#-deployment-pipeline)
- [Security Architecture](#-security-architecture)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Console Dashboard](#-console-dashboard)
- [Environment Variables](#-environment-variables)
- [Custom Runtime Template](#-custom-runtime-template)
- [GitHub Integration](#-github-integration)
- [Pricing Model](#-pricing-model)
- [Installation Guide](#-installation-guide)
- [Use Cases](#-use-cases)
- [Future Roadmap](#-future-roadmap)

---

## 🎯 Project Overview

**SecDev** is a cloud-native, autonomous deployment platform that enables developers to deploy any Git repository into isolated sandboxed environments with a single click. It eliminates the complexity of traditional CI/CD pipelines by automatically:

- **Detecting frameworks** (Next.js, Vite, Express, Static HTML, etc.)
- **Installing dependencies** with the appropriate package manager
- **Starting development/production servers** with optimal configurations
- **Streaming real-time logs** to a centralized database
- **Encrypting secrets** with military-grade AES-256-GCM encryption
- **Providing instant preview URLs** for every deployment

### Key Value Proposition

> **"One-click deployment meets autonomous security. Zero DevOps configuration required."**

---

## 🚨 The Problem We Solve

### Traditional Deployment Challenges

| Challenge | Impact | SecDev Solution |
|-----------|--------|-----------------|
| **Complex CI/CD Setup** | Weeks of DevOps configuration | One-click deploy, zero config |
| **Environment Conflicts** | Apps interfere with each other | Isolated E2B sandboxes per deployment |
| **Manual Security Scans** | Delayed vulnerability detection | Auto-scans on every deploy (planned) |
| **Secret Management** | Accidental exposure, manual encryption | Automatic AES-256-GCM encryption |
| **Log Aggregation** | Complex ELK/Splunk setups | Real-time streaming to PostgreSQL |
| **Framework-Specific Knowledge** | Developers need deep stack expertise | Framework auto-detection |
| **Resource Exhaustion** | OOM crashes, no limits | Adaptive memory management |
| **Cleanup Overhead** | Old environments pile up | Auto-destruct after timeout |

### Who Is This For?

- **Startups** needing fast iteration without DevOps overhead
- **QA Teams** requiring isolated test environments
- **Security Researchers** analyzing potentially malicious code safely
- **Freelancers** demoing client projects quickly
- **Educational Institutions** teaching cloud deployment concepts

---

## 🤖 Autonomous Security Systems

SecDev is built on the principle of **autonomous security** — systems that learn, adapt, and respond without human intervention.

### 1. Autonomous Containment (Zero-Trust Isolation)

**Concept:** Every deployment is a potential security risk until proven otherwise.

**Implementation:**
- **E2B Sandboxes** — Each deployment runs in an isolated Linux VM (microVM architecture)
- **Network Isolation** — Sandboxes cannot communicate with each other
- **Resource Limits** — 2 vCPU, 1 GB RAM, 512 MB heap space
- **Automatic Teardown** — Self-destruct after 1 hour (configurable)
- **No Configuration Required** — Isolation happens automatically on every deploy

**Security Benefit:** If a deployed app contains malware or is compromised, it cannot escape the sandbox. The blast radius is contained without human intervention.

### 2. Self-Adaptive Detection (Framework Intelligence)

**Concept:** The system learns from codebase structure to make deployment decisions.

**How It Works:**

```
User deploys repo → System analyzes codebase
    ├─ Checks for package-lock.json → Uses npm
    ├─ Checks for yarn.lock → Uses yarn
    ├─ Checks for pnpm-lock.yaml → Uses pnpm
    ├─ Reads package.json scripts
    │   ├─ Detects "next" → Next.js app
    │   ├─ Detects "vite" → Vite app
    │   ├─ Detects "react-scripts" → Create React App
    │   └─ Detects "express" → Express server
    └─ Adapts build strategy based on available memory
```

**Example Self-Adaptation:**
- **Next.js Detection:** System sees it's a Next.js app
- **Memory Analysis:** Only 1 GB available in sandbox
- **Decision:** Skip `next build` (requires ~2 GB), use `next dev` instead
- **Security Implication:** Prevents OOM-based denial-of-service

**No human configures this.** The system adapts autonomously.

### 3. Autonomous Secrets Protection

**Concept:** Encryption should be transparent and automatic.

**Implementation:**
```typescript
// Developer provides plaintext
{ key: "DATABASE_URL", value: "postgres://..." }

↓ System automatically encrypts

// Database stores encrypted
{ key: "DATABASE_URL", value: "iv:tag:ciphertext" }

↓ Deployment runtime decrypts

// Sandbox receives plaintext ENV var
process.env.DATABASE_URL = "postgres://..."
```

**Key Features:**
- **AES-256-GCM** — Authenticated encryption with associated data
- **Random IV per value** — Same plaintext encrypts differently every time
- **Automatic masking in UI** — Shows `****abc` (last 4 chars visible)
- **In-memory decryption** — Secrets never written to disk in plaintext

### 4. Continuous Autonomous Monitoring

**Concept:** Real-time situational awareness without manual log parsing.

**How Logs Are Captured:**
```typescript
// Inside E2B sandbox (background process)
sandbox.commands.run("npm install", {
  onStdout: (line) => {
    // Every log line is immediately streamed to DB
    await db.query(`
      INSERT INTO deployment_logs (sandbox_id, ts, level, msg)
      VALUES ($1, $2, 'info', $3)
    `, [sandboxId, Date.now(), line])
  },
  onStderr: (line) => {
    // Errors are tagged automatically
    await db.query(`
      INSERT INTO deployment_logs (sandbox_id, ts, level, msg)
      VALUES ($1, $2, 'error', $3)
    `, [sandboxId, Date.now(), line])
  }
})
```

**Dashboard Auto-Refresh:**
- Polls `/api/deploy` every 5 seconds
- Status transitions detected automatically:
  - `deploying` → Build in progress
  - `live` → Public URL available
  - `failed` → Error details shown
- No human monitoring required until failure alert

### 5. Autonomous Lifecycle Management

**Concept:** Resources clean themselves up.

| Stage | Autonomous Behavior |
|-------|---------------------|
| **Creation** | E2B sandbox spins up automatically on deploy request |
| **Monitoring** | Logs stream continuously, status tracked in real-time |
| **Health Checks** | Sandbox reports if process crashes (exit code ≠ 0) |
| **Timeout** | After 1 hour, sandbox self-destructs (prevents resource leak) |
| **Manual Kill** | Optional early termination via `/api/deploy/[id]` DELETE |

---

## 🏗️ Architecture Deep Dive

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                           │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ├─► Landing Page (/, /features, /pricing, /about)
                │   └─► Static content, animated hero, feature cards
                │
                ├─► Authentication
                │   ├─► Firebase Auth (Email/Password, Google OAuth)
                │   └─► NextAuth 5 (GitHub OAuth for repo access)
                │
                └─► Console Dashboard (/console/*)
                    │
                    ├─────────────────┬─────────────────┬──────────────┐
                    │                 │                 │              │
                    │             ┌───▼───┐        ┌────▼────┐    ┌───▼───┐
                    │             │ Neon  │        │   E2B   │    │GitHub │
                    │             │  DB   │        │   API   │    │  API  │
                    │             └───┬───┘        └────┬────┘    └───┬───┘
                    │                 │                 │              │
                    ▼                 │                 │              │
            ┌───────────────┐         │                 │              │
            │  /api/deploy  │◄────────┤                 │              │
            │   (POST)      │         │                 │              │
            └───────┬───────┘         │                 │              │
                    │                 │                 │              │
                    └─────────────────┼─────────────────┤              │
                                      │                 │              │
            ┌─────────────────────────▼─────────────────▼──────────────┤
            │         DEPLOYMENT PIPELINE (Background Process)         │
            │                                                           │
            │  1. Create E2B Sandbox (~3s)                             │
            │  2. Clone Git Repo (shallow, depth 1)                    │
            │  3. Detect Package Manager (pnpm/yarn/npm)               │
            │  4. Install Dependencies (inject encrypted env vars)     │
            │  5. Detect Framework (Next.js, Vite, Express, etc.)      │
            │  6. Start Server (adaptive: dev vs prod mode)            │
            │  7. Stream Logs → Neon DB in real-time                   │
            │  8. Update Status: deploying → live/failed               │
            │                                                           │
            └───────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │  Public URL     │
                            │  https://xyz... │
                            └─────────────────┘
```

### Data Flow Sequence

```
1. User authenticates with Firebase (email/password or Google)
   └─► Session created, Firebase token stored

2. User authenticates with GitHub via NextAuth (OAuth)
   └─► GitHub access token stored in session
   └─► Used to fetch user's repositories

3. User clicks "Deploy" on a GitHub repo
   └─► POST /api/deploy { repoUrl, branch, envVars }

4. API handler creates E2B sandbox
   └─► Returns { sandboxId, publicUrl, status: "deploying" }
   └─► Writes to deployments table in Neon DB

5. Background pipeline starts (fire-and-forget)
   ├─► Clones repo inside sandbox
   ├─► Detects framework from package.json
   ├─► Installs dependencies
   ├─► Starts dev/prod server
   └─► Every stdout/stderr line → INSERT into deployment_logs

6. Dashboard polls /api/deploy every 5 seconds
   └─► Status updates: deploying → live/failed
   └─► Logs displayed in real-time

7. After 1 hour (or manual kill):
   └─► E2B terminates sandbox automatically
   └─► Deployment marked as "terminated" in DB
```

---

## 🛠️ Tech Stack

### Frontend Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.x | App Router (RSC + Client Components) |
| **React** | 19.x | UI framework with concurrent features |
| **TypeScript** | 5.x | Type-safe development |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Framer Motion** | 12.x | Animation library |
| **Radix UI** | latest | Accessible UI primitives |
| **Lucide React** | latest | Icon library |
| **next-themes** | latest | Dark/light mode support |

### Backend Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js API Routes** | 16.x | Serverless API handlers |
| **NextAuth** | 5.x | GitHub OAuth integration |
| **Firebase Auth** | 11.x | User authentication |
| **Neon Database** | Serverless | PostgreSQL database |
| **E2B SDK** | latest | Sandbox orchestration |
| **Node.js** | 20.x | Runtime environment |

### Infrastructure Layer

| Technology | Purpose |
|------------|---------|
| **E2B** | Isolated Linux microVMs for deployments |
| **Neon** | Serverless PostgreSQL with connection pooling |
| **Vercel** | Hosting for Next.js app (or self-hosted) |
| **Firebase** | Authentication backend |
| **GitHub API v3** | Repository access |

### Security Libraries

```json
{
  "crypto": "Built-in Node.js crypto for AES-256-GCM",
  "Firebase Auth": "Secure token-based authentication",
  "NextAuth": "OAuth 2.0 with PKCE flow",
  "E2B": "Hardware-level isolation (Firecracker microVMs)"
}
```

---

## ⚡ Core Features

### 1. GitHub Integration 🔗

**What It Does:**
- Connects to your GitHub account via OAuth
- Fetches all public and private repositories
- Allows one-click deployment directly from the dashboard

**Technical Implementation:**
```typescript
// app/api/github/repos/route.ts
const session = await getServerSession(authOptions);
const accessToken = session?.accessToken;

const response = await fetch('https://api.github.com/user/repos?affiliation=owner,collaborator&sort=pushed', {
  headers: { Authorization: `token ${accessToken}` }
});

const repos = await response.json();
// Returns: name, url, description, language, stars, forks, default_branch
```

**Security Considerations:**
- OAuth tokens stored in session, never in database
- Scoped access (only repo metadata and code reading)
- Tokens refreshed automatically via NextAuth

### 2. E2B Sandboxes (Isolated Environments) 🔒

**What Are E2B Sandboxes?**
E2B (Environment-as-a-Service) provides **lightweight, isolated Linux containers** based on Firecracker microVMs — the same technology AWS Lambda uses.

**Specifications:**
- **CPU:** 2 vCPUs
- **Memory:** 1 GB RAM (512 MB heap for Node.js)
- **Timeout:** 1 hour (auto-terminate)
- **Isolation:** Full kernel isolation, no container escape possible
- **Network:** Sandboxed, cannot access host machine

**Why E2B vs Docker?**
| Feature | Docker | E2B Sandboxes |
|---------|--------|---------------|
| **Startup Time** | 10-30s | ~3s |
| **Isolation Level** | Process-level | Kernel-level (microVM) |
| **Security** | Container escape possible | Hardware-enforced isolation |
| **Resource Limits** | Manual cgroups | Built-in |
| **Auto-Cleanup** | Manual | Automatic timeout |

### 3. Framework Auto-Detection 🧠

**How It Works:**

```typescript
// lib/deployer.ts - detectFramework()

async function detectFramework(packageJson: any): Promise<Framework> {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  if (deps.next) {
    return {
      name: 'Next.js',
      installCmd: 'npm install',
      startCmd: 'npm run dev',  // Uses dev mode to avoid OOM
      port: 3000
    };
  }
  
  if (deps.vite) {
    return {
      name: 'Vite',
      installCmd: 'npm install',
      startCmd: 'npm run build && npx serve dist -p 3000',
      port: 3000
    };
  }
  
  if (deps.express) {
    return {
      name: 'Express',
      installCmd: 'npm install',
      startCmd: 'npm start',
      port: 3000
    };
  }
  
  // Fallback: Static file server
  return {
    name: 'Static',
    startCmd: 'npx serve -s . -p 3000',
    port: 3000
  };
}
```

**Supported Frameworks:**
- ✅ **Next.js** (dev mode)
- ✅ **Vite** (build + serve)
- ✅ **Create React App** (build + serve)
- ✅ **SvelteKit** (dev mode)
- ✅ **Express.js** (npm start)
- ✅ **Static HTML** (serve)
- ⚠️ **Next.js Build** (avoided due to 2GB memory requirement)
- ⚠️ **Angular CLI** (heavy build process)

### 4. Real-Time Logs 📊

**Log Streaming Architecture:**

```typescript
// During deployment (background process)
const installProcess = await sandbox.commands.run(`npm install`, {
  onStdout: async (line) => {
    console.log(`[INSTALL] ${line}`);
    await logToDb(sandboxId, 'info', line);
  },
  onStderr: async (line) => {
    console.error(`[ERROR] ${line}`);
    await logToDb(sandboxId, 'error', line);
  }
});

async function logToDb(sandboxId: string, level: string, msg: string) {
  const db = await getDb();
  await db.query(`
    INSERT INTO deployment_logs (sandbox_id, ts, level, msg)
    VALUES ($1, $2, $3, $4)
  `, [sandboxId, Date.now(), level, msg]);
}
```

**Log Retention:**
- **Hobby Plan:** 7 days
- **Pro Plan:** 90 days
- **Enterprise Plan:** 365 days + archival

**Log Levels:**
- `info` — Normal output (npm install progress, server start messages)
- `error` — Errors (build failures, missing dependencies)
- `warn` — Warnings (deprecated packages, security advisories)

### 5. Environment Variable Encryption 🔐

**Encryption Algorithm:** AES-256-GCM (Galois/Counter Mode)

**Why AES-256-GCM?**
- **Authenticated Encryption:** Prevents tampering (integrity + confidentiality)
- **Random IV:** Each encryption produces different ciphertext
- **NIST Approved:** Government-grade security standard
- **Fast:** Hardware-accelerated on modern CPUs

**Encryption Process:**

```typescript
// lib/env-store.ts - setEnvVar()

import crypto from 'crypto';

function encrypt(plaintext: string, key: string): string {
  const iv = crypto.randomBytes(16);  // Random initialization vector
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'base64'), iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:tag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}
```

**Decryption Process:**

```typescript
function decrypt(ciphertext: string, key: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', 
    Buffer.from(key, 'base64'),
    Buffer.from(ivHex, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Security Benefits:**
- **At-Rest Encryption:** Database compromise doesn't leak secrets
- **Masked UI Display:** Shoulder-surfing protection (`****abc`)
- **Auditability:** All env var access can be logged (future feature)

### 6. Live Preview URLs 🌐

**How It Works:**
- E2B sandboxes expose port 3000 automatically
- Public URL format: `https://{sandbox_id}.e2b.dev`
- URL is available immediately (even before build completes)
- HTTPS provided by default (Let's Encrypt)

**Example:**
```
POST /api/deploy { repoUrl: "https://github.com/user/repo.git" }

Response:
{
  "sandboxId": "abc123xyz",
  "publicUrl": "https://abc123xyz.e2b.dev",
  "status": "deploying"
}

→ Visit URL → Shows "Building..." initially
→ After build completes → Shows your app
```

---

## 🏗️ E2B Sandboxes Explained

### What Is E2B?

**E2B (Environment-as-a-Service)** is a cloud platform that provides **isolated, ephemeral Linux environments** for running untrusted code safely.

### Architecture: Firecracker microVMs

```
┌─────────────────────────────────────────────────┐
│              Host Machine (AWS/GCP)             │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐│
│  │  microVM 1  │  │  microVM 2  │  │ microVM 3││
│  │  (Sandbox)  │  │  (Sandbox)  │  │ (Sandbox)││
│  │             │  │             │  │          ││
│  │  User App   │  │  User App   │  │ User App ││
│  │  + Runtime  │  │  + Runtime  │  │ + Runtime││
│  │             │  │             │  │          ││
│  │  Isolated   │  │  Isolated   │  │ Isolated ││
│  │  Kernel     │  │  Kernel     │  │  Kernel  ││
│  └─────────────┘  └─────────────┘  └──────────┘│
│                                                 │
│         Firecracker VMM (Virtual Machine Monitor)│
└─────────────────────────────────────────────────┘
```

**Key Properties:**
- **Hardware Isolation:** Each microVM has its own kernel
- **Fast Boot:** ~125ms cold start (vs Docker's 10-30s)
- **Small Footprint:** ~5 MB memory overhead per microVM
- **Secure:** Same tech as AWS Lambda (battle-tested)

### E2B SDK Usage in SecDev

```typescript
import { Sandbox } from 'e2b';

// 1. Create sandbox from custom template
const sandbox = await Sandbox.create('secdev-web-runtime', {
  timeoutMs: 3600000  // 1 hour
});

// 2. Clone repo
await sandbox.commands.run(`
  git clone --depth 1 --branch ${branch} ${repoUrl} /home/user/app
`, { timeoutMs: 120000 });

// 3. Install dependencies
const installResult = await sandbox.commands.run(
  `cd /home/user/app && npm install`,
  {
    timeoutMs: 300000,
    envVars: decryptedEnvVars,  // Injected here
    onStdout: (line) => console.log(line),
    onStderr: (line) => console.error(line)
  }
);

// 4. Start server (background process)
await sandbox.commands.run(
  `cd /home/user/app && npm start`,
  { background: true }
);

// 5. Public URL available
console.log(`Live at: https://${sandbox.id}.e2b.dev`);

// 6. Kill sandbox when done
await sandbox.kill();
```

### Custom Template: `secdev-web-runtime`

Our custom E2B template pre-installs common tools to speed up deployments.

**Dockerfile:**
```dockerfile
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js package managers globally
RUN npm install -g pnpm serve

# Set working directory
WORKDIR /home/user/app

# Copy entrypoint script
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Expose port 3000
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/start.sh"]
```

**start.sh (Entrypoint):**
```bash
#!/bin/bash
set -e

echo "🚀 SecDev Runtime Starting..."

# Auto-detect package manager
if [ -f "pnpm-lock.yaml" ]; then
  PKG_MANAGER="pnpm"
elif [ -f "yarn.lock" ]; then
  PKG_MANAGER="yarn"
else
  PKG_MANAGER="npm"
fi

echo "📦 Detected package manager: $PKG_MANAGER"

# Install dependencies
$PKG_MANAGER install

# Auto-detect framework and start
if grep -q "next" package.json; then
  echo "▲ Next.js detected - starting dev server"
  npm run dev
elif grep -q "vite" package.json; then
  echo "⚡ Vite detected - building and serving"
  npm run build
  serve -s dist -p 3000
elif grep -q "express" package.json; then
  echo "🚂 Express detected - starting server"
  npm start
else
  echo "📄 Static files - starting file server"
  serve -s . -p 3000
fi
```

**e2b.toml Configuration:**
```toml
template_id = "secdev-web-runtime"
dockerfile = "Dockerfile"
start_cmd = "/usr/local/bin/start.sh"

[sandbox]
timeout = 3600  # 1 hour
cpu = 2
memory = 1024   # 1 GB
```

---

## 🔄 Inngest Workflow System

**Note:** Inngest integration is currently in the roadmap. Here's the planned architecture.

### What Is Inngest?

**Inngest** is a durable workflow engine that orchestrates background jobs, triggers, and event-driven processes. It's like AWS Step Functions but developer-friendly.

### Why Inngest for SecDev?

Traditional background jobs (setTimeout, setInterval) have problems:
- ❌ Lost if server crashes
- ❌ No retry logic
- ❌ Hard to monitor
- ❌ Can't pause/resume

Inngest solves this:
- ✅ Durable execution (survives server restarts)
- ✅ Automatic retries with backoff
- ✅ Built-in monitoring dashboard
- ✅ Step functions (pause, wait for events)

### Planned Workflows in SecDev

#### Workflow 1: Automated Deployment Pipeline

```typescript
// inngest/functions/deploy-workflow.ts

import { inngest } from './client';

export const deployWorkflow = inngest.createFunction(
  { id: 'deploy-workflow' },
  { event: 'deploy/requested' },
  async ({ event, step }) => {
    
    // Step 1: Create sandbox
    const sandbox = await step.run('create-sandbox', async () => {
      return await Sandbox.create('secdev-web-runtime');
    });
    
    // Step 2: Clone repo (with timeout)
    await step.run('clone-repo', async () => {
      await sandbox.commands.run(`git clone ${event.data.repoUrl}`);
    });
    
    // Step 3: Install dependencies
    const installResult = await step.run('install-deps', async () => {
      return await sandbox.commands.run('npm install');
    });
    
    // Step 4: Run security scan (future)
    const securityReport = await step.run('security-scan', async () => {
      return await runSASTScan(sandbox);
    });
    
    // Step 5: Start server
    await step.run('start-server', async () => {
      await sandbox.commands.run('npm start', { background: true });
    });
    
    // Step 6: Health check (wait for port 3000)
    await step.sleep('wait-for-server', '10s');
    
    // Step 7: Run automated tests
    const testResults = await step.run('run-tests', async () => {
      return await runE2ETests(sandbox.getURL());
    });
    
    // Step 8: Notify user
    await step.run('notify-user', async () => {
      await sendEmail({
        to: event.data.userEmail,
        subject: 'Deployment Complete',
        body: `Your app is live at ${sandbox.getURL()}`
      });
    });
    
    return { 
      sandboxId: sandbox.id, 
      publicUrl: sandbox.getURL(),
      securityReport,
      testResults
    };
  }
);
```

#### Workflow 2: Automated Testing After Deploy

```typescript
export const testingWorkflow = inngest.createFunction(
  { id: 'testing-workflow' },
  { event: 'deploy/completed' },
  async ({ event, step }) => {
    
    const { publicUrl } = event.data;
    
    // Unit tests
    const unitTests = await step.run('unit-tests', async () => {
      return await runJestTests(event.data.sandboxId);
    });
    
    // Integration tests
    const integrationTests = await step.run('integration-tests', async () => {
      return await runPlaywrightTests(publicUrl);
    });
    
    // Load testing
    const loadTests = await step.run('load-tests', async () => {
      return await runK6LoadTest(publicUrl);
    });
    
    // AI-generated tests (future)
    const aiTests = await step.run('ai-generated-tests', async () => {
      const testCases = await generateTestsWithAI(publicUrl);
      return await runGeneratedTests(testCases);
    });
    
    return { unitTests, integrationTests, loadTests, aiTests };
  }
);
```

#### Workflow 3: Security Scanning Pipeline

```typescript
export const securityWorkflow = inngest.createFunction(
  { id: 'security-workflow' },
  { event: 'deploy/completed' },
  async ({ event, step }) => {
    
    // SAST (Static Application Security Testing)
    const sastResults = await step.run('sast-scan', async () => {
      return await runBanditScan(event.data.sandboxId);
    });
    
    // Dependency vulnerability check
    const depCheck = await step.run('dependency-check', async () => {
      return await runNpmAudit(event.data.sandboxId);
    });
    
    // Secret scanning
    const secretScan = await step.run('secret-scan', async () => {
      return await detectLeakedSecrets(event.data.sandboxId);
    });
    
    // OWASP Top 10 check
    const owaspScan = await step.run('owasp-scan', async () => {
      return await runZAPScan(event.data.publicUrl);
    });
    
    // Calculate security score
    const securityScore = await step.run('calculate-score', async () => {
      return calculateSecurityScore({
        sast: sastResults,
        deps: depCheck,
        secrets: secretScan,
        owasp: owaspScan
      });
    });
    
    // If critical issues found, notify immediately
    if (securityScore < 50) {
      await step.run('critical-alert', async () => {
        await sendSlackAlert(`🚨 Critical security issues found in ${event.data.repoName}`);
      });
    }
    
    return { securityScore, sastResults, depCheck, secretScan, owaspScan };
  }
);
```

#### Workflow 4: Sandbox Cleanup & Resource Management

```typescript
export const cleanupWorkflow = inngest.createFunction(
  { id: 'cleanup-workflow' },
  { cron: '0 * * * *' },  // Every hour
  async ({ step }) => {
    
    // Find expired sandboxes
    const expiredSandboxes = await step.run('find-expired', async () => {
      const db = await getDb();
      const result = await db.query(`
        SELECT sandbox_id 
        FROM deployments 
        WHERE started_at < $1 AND status = 'live'
      `, [Date.now() - 3600000]);  // Older than 1 hour
      return result.rows;
    });
    
    // Kill each sandbox
    for (const { sandbox_id } of expiredSandboxes) {
      await step.run(`kill-${sandbox_id}`, async () => {
        const sandbox = new Sandbox(sandbox_id);
        await sandbox.kill();
        
        // Update database
        const db = await getDb();
        await db.query(`
          UPDATE deployments 
          SET status = 'terminated' 
          WHERE sandbox_id = $1
        `, [sandbox_id]);
      });
    }
    
    return { cleaned: expiredSandboxes.length };
  }
);
```

### Inngest Dashboard Benefits

Once integrated, you'll get:
- **Visual workflow execution** — See each step in real-time
- **Failed step debugging** — Replay from any step
- **Performance metrics** — Track how long each step takes
- **Event history** — Audit trail of all deployments

---

## 🚀 Deployment Pipeline

This is the **core automated process** that runs when you click "Deploy".

### Pipeline Stages (Detailed)

```
┌────────────────────────────────────────────────────┐
│         STAGE 1: VALIDATION & SETUP                │
├────────────────────────────────────────────────────┤
│ Duration: ~1-2 seconds                             │
│                                                    │
│ 1. Validate GitHub URL                            │
│ 2. Check if repo is accessible                    │
│ 3. Fetch encrypted env vars from DB               │
│ 4. Decrypt env vars using NEXTAUTH_SECRET         │
│ 5. Create database record (status: 'deploying')   │
└────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│         STAGE 2: SANDBOX CREATION                  │
├────────────────────────────────────────────────────┤
│ Duration: ~3 seconds                               │
│                                                    │
│ 1. Call E2B API: Sandbox.create()                 │
│ 2. Provision microVM (2 vCPU, 1 GB RAM)           │
│ 3. Load custom template (secdev-web-runtime)      │
│ 4. Assign public URL: https://{id}.e2b.dev        │
│ 5. Return sandbox ID immediately to user          │
└────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│         STAGE 3: GIT CLONE                         │
├────────────────────────────────────────────────────┤
│ Duration: 5-60 seconds (depends on repo size)     │
│ Timeout: 120 seconds                               │
│                                                    │
│ Command:                                           │
│   git clone --depth 1 --branch {branch} {repoUrl} │
│                                                    │
│ Logs streamed:                                     │
│   "Cloning into '/home/user/app'..."              │
│   "Receiving objects: 100%"                        │
└────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│         STAGE 4: PACKAGE MANAGER DETECTION         │
├────────────────────────────────────────────────────┤
│ Duration: <1 second                                │
│                                                    │
│ Logic:                                             │
│   if (exists pnpm-lock.yaml) → use pnpm           │
│   else if (exists yarn.lock) → use yarn           │
│   else → use npm                                   │
└────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│         STAGE 5: DEPENDENCY INSTALLATION           │
├────────────────────────────────────────────────────┤
│ Duration: 30-300 seconds (depends on deps)        │
│ Timeout: 300 seconds                               │
│ Memory Limit: NODE_OPTIONS=--max-old-space-size=512│
│                                                    │
│ Command:                                           │
│   cd /home/user/app && npm install                 │
│                                                    │
│ Logs streamed:                                     │
│   "npm WARN deprecated ..."                        │
│   "added 1234 packages in 45s"                     │
│                                                    │
│ Environment Variables Injected:                    │
│   DATABASE_URL, API_KEY, etc. (decrypted)         │
└────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│         STAGE 6: FRAMEWORK DETECTION               │
├────────────────────────────────────────────────────┤
│ Duration: <1 second                                │
│                                                    │
│ Reads package.json dependencies:                  │
│   "next" → Next.js                                 │
│   "vite" → Vite                                    │
│   "react-scripts" → Create React App               │
│   "express" → Express.js                           │
│   default → Static HTML                            │
└────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│         STAGE 7: BUILD & START SERVER              │
├────────────────────────────────────────────────────┤
│ Duration: 10-180 seconds (depends on framework)   │
│ Timeout: 300 seconds                               │
│                                                    │
│ Next.js:                                           │
│   npm run dev (NOT build, to avoid OOM)           │
│   → Starts on port 3000                            │
│                                                    │
│ Vite:                                              │
│   npm run build                                    │
│   npx serve dist -p 3000                           │
│                                                    │
│ Express:                                           │
│   npm start                                        │
│                                                    │
│ Static:                                            │
│   npx serve -s . -p 3000                           │
└────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│         STAGE 8: HEALTH CHECK & FINALIZE           │
├────────────────────────────────────────────────────┤
│ Duration: 5-10 seconds                             │
│                                                    │
│ 1. Wait for port 3000 to be listening             │
│ 2. Send HTTP GET to http://localhost:3000         │
│ 3. If response received → Status: 'live'          │
│ 4. If timeout → Status: 'failed'                   │
│ 5. Update database                                 │
│ 6. Send webhook notification (future)             │
└────────────────────────────────────────────────────┘
                       │
                       ▼
                  ✅ DEPLOYED
           https://{sandbox_id}.e2b.dev
```

### Error Handling at Each Stage

| Stage | Possible Errors | Response |
|-------|----------------|----------|
| **Validation** | Invalid repo URL | Return 400 error immediately |
| **Sandbox Creation** | E2B API timeout | Retry up to 3 times, then fail |
| **Git Clone** | Private repo without access | Log error, status = 'failed' |
| **Install** | Missing package.json | Use static file server fallback |
| **Build** | Out of memory (OOM) | Kill process, recommend smaller build |
| **Start** | Port 3000 already in use | Try port 3001, 3002, etc. |
| **Health Check** | No response after 30s | Mark as 'failed', preserve logs |

### Adaptive Strategies

**Memory-Based Decisions:**
```typescript
const availableMemory = 1024;  // MB

if (framework === 'Next.js' && availableMemory < 2048) {
  console.log('⚠️ Using next dev (build requires 2GB+)');
  startCmd = 'npm run dev';
} else if (framework === 'Next.js') {
  startCmd = 'npm run build && npm start';
}
```

**Timeout-Based Decisions:**
```typescript
if (repoSize > 500_000_000) {  // 500 MB
  cloneTimeout = 300000;  // 5 minutes
} else {
  cloneTimeout = 120000;  // 2 minutes
}
```

---

## 🔒 Security Architecture

### Defense in Depth (Multiple Layers)

```
┌───────────────────────────────────────────────────┐
│  LAYER 1: AUTHENTICATION                          │
│  ────────────────────────────────────────────     │
│  • Firebase Auth (email/password, Google OAuth)   │
│  • NextAuth (GitHub OAuth with PKCE)             │
│  • Session tokens with expiry                     │
│  • CSRF protection (built-in to Next.js)          │
└───────────────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────┐
│  LAYER 2: AUTHORIZATION                           │
│  ────────────────────────────────────────────     │
│  • User can only see their own deployments        │
│  • GitHub OAuth scopes: repo:read only            │
│  • Environment vars scoped per project            │
│  • No admin/sudo access in sandboxes              │
└───────────────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────┐
│  LAYER 3: DATA ENCRYPTION                         │
│  ────────────────────────────────────────────     │
│  • Environment vars: AES-256-GCM at rest          │
│  • Database: TLS 1.3 in transit (Neon)            │
│  • GitHub tokens: encrypted in session            │
│  • Passwords: hashed with bcrypt (Firebase)       │
└───────────────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────┐
│  LAYER 4: SANDBOX ISOLATION                       │
│  ────────────────────────────────────────────     │
│  • Firecracker microVMs (hardware isolation)      │
│  • No container-to-container communication        │
│  • Network egress filtering (future)              │
│  • Resource limits (CPU, RAM, disk)               │
└───────────────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────┐
│  LAYER 5: MONITORING & RESPONSE                   │
│  ────────────────────────────────────────────     │
│  • Real-time log streaming                        │
│  • Anomaly detection (future)                     │
│  • Automatic sandbox termination (1-hour timeout) │
│  • Rate limiting on API endpoints                 │
└───────────────────────────────────────────────────┘
```

### Threat Model & Mitigations

| Threat | Attack Vector | Mitigation |
|--------|---------------|------------|
| **Malicious Code Execution** | User deploys malware | Sandboxes are isolated microVMs, cannot escape |
| **Crypto Mining** | User deploys coin miner | CPU limits + 1-hour timeout prevents abuse |
| **Data Exfiltration** | Steal env vars from DB | AES-256-GCM encryption, masked in UI |
| **Session Hijacking** | Steal Firebase/NextAuth token | HTTP-only cookies, short expiry |
| **SQL Injection** | Malicious input to API | Parameterized queries via Neon |
| **Container Escape** | Break out of sandbox | Firecracker microVMs (kernel-level isolation) |
| **DoS Attack** | Spam deploy requests | Rate limiting (future: 10 deploys/minute) |
| **Secret Leakage in Logs** | Env vars accidentally logged | Filter out known secrets in log stream |

### Compliance & Standards

| Standard | Coverage |
|----------|----------|
| **OWASP Top 10** | Addressed (SQL injection, XSS, broken auth) |
| **NIST Cybersecurity Framework** | Identify, Protect, Detect, Respond, Recover |
| **GDPR** | User data encrypted, right to delete |
| **SOC 2 (planned)** | Audit logs, access controls |

---

## 🗄️ Database Schema

### Tables

#### `deployments`

Tracks each deployment (one per sandbox).

```sql
CREATE TABLE deployments (
  sandbox_id TEXT PRIMARY KEY,
  repo_url TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  public_url TEXT,
  logs_url TEXT,
  status TEXT CHECK (status IN ('deploying', 'live', 'failed', 'terminated')),
  started_at BIGINT NOT NULL,
  user_id TEXT NOT NULL,  -- Firebase user ID
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deployments_user ON deployments(user_id);
CREATE INDEX idx_deployments_status ON deployments(status);
```

**Example Row:**
```json
{
  "sandbox_id": "abc123xyz",
  "repo_url": "https://github.com/user/repo.git",
  "repo_name": "user/repo",
  "branch": "main",
  "public_url": "https://abc123xyz.e2b.dev",
  "logs_url": "https://secdev.com/console/deployments/abc123xyz",
  "status": "live",
  "started_at": 1709856000000,
  "user_id": "firebase_uid_12345"
}
```

#### `deployment_logs`

Stores every log line from each deployment.

```sql
CREATE TABLE deployment_logs (
  id BIGSERIAL PRIMARY KEY,
  sandbox_id TEXT NOT NULL REFERENCES deployments(sandbox_id) ON DELETE CASCADE,
  ts BIGINT NOT NULL,
  level TEXT CHECK (level IN ('info', 'error', 'warn')),
  msg TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_logs_sandbox ON deployment_logs(sandbox_id, ts DESC);
```

**Example Rows:**
```json
[
  {
    "id": 1,
    "sandbox_id": "abc123xyz",
    "ts": 1709856010000,
    "level": "info",
    "msg": "Cloning into '/home/user/app'..."
  },
  {
    "id": 2,
    "sandbox_id": "abc123xyz",
    "ts": 1709856015000,
    "level": "info",
    "msg": "npm WARN deprecated @babel/plugin-proposal-class-properties@7.18.6"
  },
  {
    "id": 3,
    "sandbox_id": "abc123xyz",
    "ts": 1709856090000,
    "level": "info",
    "msg": "added 1432 packages in 75s"
  }
]
```

#### `env_vars`

Stores encrypted environment variables per project.

```sql
CREATE TABLE env_vars (
  project TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,  -- Encrypted: iv:tag:ciphertext
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project, key, user_id)
);

CREATE INDEX idx_env_vars_project ON env_vars(project, user_id);
```

**Example Row:**
```json
{
  "project": "user/repo",
  "key": "DATABASE_URL",
  "value": "a1b2c3d4e5f6:1234abcd:9f8e7d6c5b4a3d2e1f0c9b8a7d6e5f4c3b2a1",
  "user_id": "firebase_uid_12345"
}
```

When decrypted:
```
DATABASE_URL = "postgresql://user:pass@host:5432/db"
```

---

## 🔑 Environment Variables

### Required Variables

Create a `.env` file in the root directory:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# E2B API
E2B_API_KEY=e2b_your_api_key_here

# GitHub OAuth (for NextAuth)
CLIENT_ID=your_github_oauth_client_id
CLIENT_SECRET=your_github_oauth_client_secret

# NextAuth Configuration
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Neon Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

### How to Get Each Variable

#### Firebase (Authentication)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project or select existing
3. Go to Project Settings → General
4. Scroll to "Your apps" → Web app
5. Copy all config values

#### E2B (Sandboxes)
1. Sign up at [e2b.dev](https://e2b.dev/)
2. Go to Dashboard → API Keys
3. Create new API key
4. Copy the key (starts with `e2b_`)

#### GitHub OAuth (Repository Access)
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - Application name: SecDev
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:3000/api/auth/callback/github
4. Copy Client ID and generate Client Secret

#### NextAuth Secret
```bash
openssl rand -base64 32
```

#### Neon Database (PostgreSQL)
1. Sign up at [neon.tech](https://neon.tech/)
2. Create new project
3. Copy connection string from dashboard
4. Ensure it includes `?sslmode=require` at the end

---

## 💰 Pricing Model

| Feature | Hobby (Free) | Pro ($29/mo) | Enterprise (Custom) |
|---------|--------------|--------------|---------------------|
| **Deployments/month** | 5 | Unlimited | Unlimited |
| **Concurrent sandboxes** | 1 | 5 | Unlimited |
| **Sandbox timeout** | 1 hour | 4 hours | Custom |
| **Repository access** | Public only | Public + Private | All + GitHub Enterprise |
| **Log retention** | 7 days | 90 days | 365 days + archival |
| **Environment variables** | 10 per project | Unlimited | Unlimited |
| **Build minutes** | 100/month | 10,000/month | Unlimited |
| **Bandwidth** | 1 GB/month | 100 GB/month | Unlimited |
| **AI test generation** | ❌ | ✅ | ✅ |
| **Security scanning** | ❌ | Basic (SAST only) | Advanced (SAST + DAST + compliance) |
| **Support** | Community (Discord) | Email (24h response) | Dedicated Slack channel + SLA |
| **SSO/SAML** | ❌ | ❌ | ✅ |
| **Audit logs** | ❌ | ❌ | ✅ |
| **Custom domains** | ❌ | 3 domains | Unlimited |
| **Webhooks** | ❌ | ✅ | ✅ |
| **API access** | Read-only | Full | Full + priority rate limits |

---

## 📦 Installation Guide

### Prerequisites

- Node.js 20+ and npm
- Git
- Firebase account
- E2B account
- Neon database
- GitHub OAuth app

### Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/secdev.git
cd secdev

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your values

# Run development server
npm run dev

# Visit http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
```

Or deploy to Vercel:

```bash
vercel deploy --prod
```

---

## 🎯 Use Cases

### 1. **Freelance Developers**
**Scenario:** Demoing work-in-progress to clients

**Workflow:**
1. Push code to GitHub
2. Click "Deploy" in SecDev dashboard
3. Share public URL with client

**Benefits:**
- No Vercel/Netlify account needed for each project
- Client can't access source code
- Sandbox auto-destroys after demo

---

### 2. **Security Researchers**
**Scenario:** Analyzing potentially malicious open-source packages

**Workflow:**
1. Fork suspicious GitHub repo
2. Deploy via SecDev
3. Monitor logs for malicious behavior
4. Kill sandbox when done

**Benefits:**
- Malware can't escape sandbox
- Full logging of all actions
- No risk to host machine

---

### 3. **QA Teams**
**Scenario:** Testing feature branches before merging

**Workflow:**
1. Developer opens PR with branch `feature/new-button`
2. QA deploys that branch via SecDev
3. Tests functionality on live URL

**Benefits:**
- Isolated environment per branch
- No "works on my machine" issues
- Easy to spin up/down test environments

---

### 4. **Educational Institutions**
**Scenario:** Teaching cloud deployment concepts

**Workflow:**
1. Students clone assignment repo
2. Make changes and commit
3. Deploy via SecDev to see results

**Benefits:**
- No AWS/GCP bills for students
- Automatic cleanup (1-hour timeout)
- Teaches real-world deployment

---

### 5. **Hackathons**
**Scenario:** Rapid prototyping and judging

**Workflow:**
1. Teams build projects during hackathon
2. Deploy final version to SecDev
3. Submit public URL for judging

**Benefits:**
- Fast deployment (no DevOps knowledge needed)
- All projects accessible from one place
- Sandboxes auto-clean after event

---

## 🚀 Future Roadmap

### Q2 2026
- ✅ Inngest workflow integration
- ✅ Automated SAST scanning
- ✅ AI-powered test generation
- ✅ Webhook support

### Q3 2026
- ✅ Custom domain support
- ✅ Advanced DAST scanning
- ✅ Real-time collaboration
- ✅ Deployment rollback

### Q4 2026
- ✅ Multi-region deployments
- ✅ Container registry integration
- ✅ Kubernetes deployment target
- ✅ Compliance reports (SOC 2, ISO 27001)

### 2027
- ✅ Edge function support
- ✅ GraphQL API playground
- ✅ Visual deployment pipeline builder
- ✅ Mobile app (iOS/Android)

---

## 📚 Additional Resources

### Documentation
- [E2B Documentation](https://e2b.dev/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [NextAuth.js v5](https://authjs.dev/)
- [Neon Serverless Postgres](https://neon.tech/docs)

---

## 🏁 Conclusion

SecDev represents the **next generation of deployment infrastructure** — where security is not an afterthought but the foundational architecture. By combining:

- **Autonomous detection** (framework auto-discovery)
- **Autonomous containment** (E2B sandboxes)
- **Autonomous encryption** (AES-256-GCM)
- **Autonomous monitoring** (real-time log streaming)
- **Autonomous cleanup** (timeout-based resource management)

...we create a system that **requires minimal human intervention** while maintaining military-grade security standards.

For teams that value **speed without compromising safety**, SecDev is the deployment platform of choice.

---

**Built with ❤️ for Autonomous Security Systems**

*Last Updated: March 2026*
