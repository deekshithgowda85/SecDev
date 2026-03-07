# SecDev — Autonomous Cloud Deployment & Security Platform

<div align="center">

**Deploy, Test & Pen-Test in Isolated Sandboxes**

_A self-learning, self-adaptive security-first deployment platform with autonomous security scanning, AI-assisted attack pipelines, and real-time monitoring._

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![E2B](https://img.shields.io/badge/E2B-Sandboxes-green)](https://e2b.dev/)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-purple)](https://neon.tech/)
[![Inngest](https://img.shields.io/badge/Inngest-Workflows-orange)](https://www.inngest.com/)
[![Groq](https://img.shields.io/badge/Groq-AI-red)](https://groq.com/)

</div>

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Core Features](#-core-features)
- [Attack Pipeline](#-attack-pipeline)
- [Security Testing Suite](#-security-testing-suite)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Console Dashboard](#-console-dashboard)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Environment Variables](#-environment-variables)
- [Custom Runtime Template](#-custom-runtime-template)
- [Installation Guide](#-installation-guide)
- [Project File Structure](#-project-file-structure)
- [Security Architecture Highlights](#-security-architecture-highlights)
- [Scoring Model](#-scoring-model)

---

## 🎯 Project Overview

**SecDev** is a cloud-native autonomous deployment platform that enables developers to deploy any Git repository into isolated E2B sandbox environments with one click, then immediately run comprehensive security, performance, and penetration tests against the live deployment.

### Key Value Proposition

> **"One-click deployment meets autonomous pen-testing. Zero DevOps configuration required."**

**What makes SecDev different:**

- Every deployment is automatically testable — get a real security score before your app reaches production
- AI-assisted attack pipeline discovers vulnerabilities using SQL injection, auth bypass, command injection, and parameter manipulation agents
- All test results are persisted per-user in PostgreSQL — full history with re-loadable reports
- Live terminal streaming for all operations — see exactly what's running in real time
- Stop any scan mid-flight with a single button click

---

## ✨ Core Features

### 1. One-Click Git Deployment

- Connects to your GitHub account via OAuth
- Fetches all public and private repositories
- Detects framework automatically: Next.js, Vite, Express, Create React App, Static HTML
- Detects package manager automatically: pnpm / yarn / npm
- Adaptive memory management — uses `next dev` instead of `next build` to avoid OOM crashes in 1 GB sandboxes
- Streams all build and server logs in real time to the dashboard
- Provides a public preview URL for every deployment
- Auto-destroys sandbox after 1 hour (configurable)

### 2. Environment Variable Management

- Add, view, update, and delete per-deployment environment variables
- Automatic **AES-256-GCM** encryption at rest
- Random IV per value — same plaintext encrypts differently every time
- UI shows masked values (`****abc` — last 4 chars visible)
- Secrets injected into sandbox at deployment time, never written to disk in plaintext

### 3. GitHub Repository Browser

- Lists all repos (public + private) from authenticated GitHub account
- Shows visibility, fork status, language, star count, last updated
- Supports table and card view modes
- One-click deploy from within the repo browser

### 4. Real-Time Log Streaming

- Every line from every deployment (stdout + stderr) is inserted into `deployment_logs`
- Dashboard auto-refreshes every 5 seconds
- Color-coded: `error` lines in red, `info` lines in normal text
- Filterable by sandbox ID

### 5. Multi-Tenant User Isolation

- All data (deployments, logs, test runs, secrets, scans) is strictly scoped to `user_id`
- No cross-user data leakage at the API or database level
- Session-based auth via NextAuth (GitHub OAuth) + Firebase (email / Google)

### 6. Billing & Plan Management

- Free / Pro / Enterprise plan UI
- Current plan indicator with usage breakdown
- Upgrade / downgrade flow (UI-ready)

---

## ⚔️ Attack Pipeline

The crown feature of SecDev — a **modular, AI-assisted penetration testing pipeline** that runs against any URL (your E2B deployment or any external target you own).

### How It Works

```
Target URL
    │
    ▼
┌─────────────────────────────────┐
│  Route Discovery (routeParser)  │  → Probes common paths, crawls links
└────────────────┬────────────────┘
                 │ discovered routes
    ┌────────────┼────────────────────────────┐
    │            │                            │
    ▼            ▼                            ▼
┌───────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  SQL  │  │   Auth   │  │Injection │  │Parameter │
│Inject │  │  Bypass  │  │  Agent   │  │  Agent   │
└───┬───┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
    └────────────┴─────────────┴─────────────┘
                 │ findings
                 ▼
    ┌─────────────────────────┐
    │   Security Scanner      │  → Vibetest (fuzz), API validation, scoring
    └────────────┬────────────┘
                 │
                 ▼
    ┌─────────────────────────┐
    │  Performance Scanner    │  → 50 req × 10 concurrent, p95/p99 latency
    └────────────┬────────────┘   (optional, enable in UI)
                 │
                 ▼
    ┌─────────────────────────┐
    │   AI Analysis (Groq)    │  → llama-3.1-8b-instant summarizes findings,
    └────────────┬────────────┘     ranks risks, gives remediation steps
                 │
                 ▼
          VulnerabilityReport  →  Stored as JSON in DB, reloadable from history
```

### Security Agents

| Agent             | Checks                                                                              | Techniques                                                        |
| ----------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **SQL Injection** | 4 strategies                                                                        | Error-based, blind boolean, time-based, UNION exfiltration        |
| **Auth Bypass**   | JWT manipulation, default creds, mass assignment, forced browsing                   | `alg: none`, weak secrets, IDOR on user IDs                       |
| **Injection**     | Command injection, SSTI, path traversal, CRLF                                       | `; cat /etc/passwd`, `{{7*7}}`, `../../etc/passwd`, `\r\nHeader:` |
| **Parameter**     | Privilege escalation, HTTP parameter pollution, type confusion, prototype pollution | `?admin=true`, `?id[]=1&id[]=2`, `{"__proto__":{}}`               |

### Payload Generator

- **130+ built-in payloads** across all attack categories
- SQL payloads: error-based, union, blind boolean, time-based
- Auth payloads: default credentials, JWT manipulation payloads, IDOR IDs
- Injection payloads: shell commands, SSTI probes, path traversal chains, CRLF sequences
- Parameter payloads: type confusion, mass assignment, prototype pollution objects
- Fuzz payloads: boundary values, null bytes, oversized inputs, special chars
- **AI payload augmentation** via Groq — generates target-specific payload variations based on app behavior (when enabled)

### Attack Pipeline UI (`/console/attack-pipeline`)

| Feature                | Description                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Target selector**    | Toggle between E2B deployment dropdown and custom URL input                                                                                      |
| **AI Analysis toggle** | Enable/disable Groq llama-3.1-8b-instant analysis                                                                                                |
| **Performance toggle** | Enable/disable 50 req × 10 concurrent load test                                                                                                  |
| **Run Attack button**  | Starts scan and immediately switches to a Stop button                                                                                            |
| **Stop button**        | Aborts the SSE stream client-side; sends PATCH to DB to mark run as `stopped`                                                                    |
| **Live terminal**      | Real-time SSE log stream with green-on-black mono font, auto-scroll                                                                              |
| **Score gauge**        | SVG arc gauge (0–100) color-coded: green ≥ 85, yellow ≥ 65, orange ≥ 45, red < 45                                                                |
| **Severity cards**     | Critical / High / Medium / Low / Passed / Total count tiles                                                                                      |
| **AI Analysis panel**  | Summary, key findings list, and remediation recommendations from Groq                                                                            |
| **Findings tab**       | Grouped by agent, collapsible sections; each finding shows severity badge, payload, curl replay command with copy button, and remediation advice |
| **Vibetest tab**       | Fuzz test results table with route, test case, status, and evidence                                                                              |
| **Coverage tab**       | Route grid: red = issues found, green = clean, gray = untested                                                                                   |
| **Performance tab**    | Per-route avg latency, p95 latency, req/s, success rate, and pass/fail status                                                                    |
| **History section**    | All past runs with date, URL, score, risk badge, and status — click any completed run to reload its full report                                  |

### Attack Pipeline Files

```
lib/attack-pipeline/
├── pipeline/
│   └── runScan.ts              ← Entry point: 4-step pipeline orchestrator
├── agents/
│   ├── sqlInjectionAgent.ts    ← SQL injection (4 strategies)
│   ├── authBypassAgent.ts      ← Auth bypass (JWT, default creds, IDOR)
│   ├── injectionAgent.ts       ← CMD/SSTI/path traversal/CRLF
│   ├── parameterAgent.ts       ← HPP, type confusion, prototype pollution
│   └── orchestrator.ts         ← Routes → agent assignment → batched execution
├── scanners/
│   ├── securityScanner.ts      ← Orchestrator + vibetest + API validation + scoring
│   └── performanceScanner.ts   ← Load test: p50/p95/p99 latency per route
├── parsers/
│   └── routeParser.ts          ← Route discovery via HTTP probing + link crawling
└── utils/
    ├── httpClient.ts           ← Stateful HTTP client with session cookie jar
    └── payloadGenerator.ts     ← 130+ payloads + AI augmentation via Groq
```

### API Endpoints (Attack Pipeline)

| Method  | Endpoint                             | Description                                          |
| ------- | ------------------------------------ | ---------------------------------------------------- |
| `POST`  | `/api/attack-pipeline`               | Start scan — returns `text/event-stream` SSE         |
| `GET`   | `/api/attack-pipeline`               | List user's attack pipeline runs (last 30)           |
| `PATCH` | `/api/attack-pipeline`               | Stop a running scan `{ runId }` → status `stopped`   |
| `GET`   | `/api/attack-pipeline/report?runId=` | Fetch full `VulnerabilityReport` for a completed run |

#### SSE Event Stream Format

```jsonc
{ "type": "start",    "runId": "ap_abc123", "baseUrl": "https://..." }
{ "type": "progress", "msg": "→ Testing /api/login for SQL injection..." }
{ "type": "complete", "runId": "ap_abc123", "report": { /* VulnerabilityReport */ } }
{ "type": "error",    "runId": "ap_abc123", "error": "Connection refused" }
```

---

## 🔒 Security Testing Suite

In addition to the Attack Pipeline, SecDev has a full Playwright-based security testing system powered by Inngest background functions.

### Test Pages

| Page                  | URL                             | What It Tests                                                                       |
| --------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| **Security Scans**    | `/console/security`             | Playwright: XSS, security headers, HTTPS enforcement, clickjacking, cookie security |
| **AI Security Agent** | `/console/security` (Agent tab) | Inngest-powered AI agent that analyzes app behavior and generates findings          |
| **E2E Tests**         | `/console/e2e`                  | Playwright end-to-end user journey tests inside E2B sandbox                         |
| **API Testing**       | `/console/api-testing`          | HTTP request builder: method, headers, body, response inspection                    |
| **Load Testing**      | `/console/load`                 | Configurable concurrent user simulation with latency tracking                       |
| **Visual Testing**    | `/console/visual`               | Screenshots + visual diff via Playwright                                            |
| **Attack Pipeline**   | `/console/attack-pipeline`      | Full penetration test pipeline (see above)                                          |

### Shared Test Page Features

All test pages share the same UX pattern:

- Deployment dropdown (select active E2B sandbox) **or** custom URL input toggle
- **Run** / **Stop** controls
- Live terminal with real-time SSE log streaming
- History section always visible (even when 0 runs exist)
- Status badges: `running` / `completed` / `failed` / `stopped`
- Click any completed run in history to reload full results

### Inngest Workflow Functions

| Function            | Trigger                        | What It Does                                                                                      |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `run-security-scan` | POST `/api/security-agent/run` | Spawns E2B sandbox → installs Playwright → runs security checks → AI analysis → writes logs to DB |
| `run-e2e-tests`     | POST `/api/tests/run`          | Browser automation → screenshot capture → test assertions                                         |
| `run-load-test`     | POST `/api/tests/run`          | Concurrent HTTP bombardment → latency aggregation                                                 |
| `run-visual-test`   | POST `/api/tests/run`          | Puppeteer screenshots → pixel diff comparison                                                     |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js)                          │
│                                                                    │
│  Public Pages        Auth              Console (/console/*)        │
│  /, /login,      Firebase +        ┌──────────────────────────┐  │
│  /register       NextAuth          │  Sidebar Navigation      │  │
│                                    │  ─ Overview              │  │
│                                    │  ─ Deployments           │  │
│                                    │  ─ Repositories          │  │
│                                    │  Testing:                │  │
│                                    │  ─ Security              │  │
│                                    │  ─ E2E Tests             │  │
│                                    │  ─ API Testing           │  │
│                                    │  ─ Load Testing          │  │
│                                    │  ─ Visual Testing        │  │
│                                    │  ─ Attack Pipeline       │  │
│                                    │  Settings:               │  │
│                                    │  ─ Secrets               │  │
│                                    │  ─ Billing               │  │
│                                    └──────────────────────────┘  │
└──────────────────┬───────────────────────────────────────────────┘
                   │
         API Routes (/api/*)
                   │
    ┌──────────────┴──────────────────────────────────────┐
    │                    API Layer                          │
    │                                                       │
    │  /api/deploy           Deployment CRUD + logs        │
    │  /api/repos            GitHub repo list              │
    │  /api/secrets          Encrypted env vars CRUD       │
    │  /api/security-agent   Inngest workflow trigger      │
    │  /api/tests/run        Generic test runner + stop    │
    │  /api/attack-pipeline  Attack pipeline SSE + CRUD    │
    │  /api/attack-pipeline/report  Fetch full report      │
    └──────────────┬──────────────────────────────────────┘
                   │
    ┌──────────────┴──────────────────────────────────────┐
    │               Infrastructure                          │
    │                                                       │
    │  Neon PostgreSQL    E2B Sandboxes    Inngest          │
    │  (all user data)    (isolated VMs)  (workflows)      │
    │                                                       │
    │  Groq AI            GitHub API      Firebase Auth    │
    │  (analysis)         (repo list)     (user auth)      │
    └──────────────────────────────────────────────────────┘
```

### Deployment Pipeline Internals

```
User clicks Deploy
       │
       ▼
POST /api/deploy
       │
       ├── Create E2B sandbox (~3s)
       ├── Insert deployment record (status: "deploying")
       └── Start background pipeline (fire-and-forget)
              │
              ├── Clone Git repo (shallow, depth 1)
              ├── Detect package manager (pnpm/yarn/npm)
              ├── Install dependencies
              │     └── Inject encrypted env vars as process.env
              ├── Detect framework from package.json scripts
              │     ├── "next" → Next.js (use next dev, memory-safe)
              │     ├── "vite" → Vite (npm run dev)
              │     ├── "react-scripts" → CRA (npm start)
              │     └── "node" / other → direct node execution
              ├── Start server process
              │     └── stream every stdout/stderr line → deployment_logs
              └── Update status: deploying → live / failed
```

---

## 🛠️ Tech Stack

| Layer          | Technology                    | Purpose                                             |
| -------------- | ----------------------------- | --------------------------------------------------- |
| **Framework**  | Next.js 15 (App Router)       | SSR, API routes, React Server Components            |
| **Language**   | TypeScript 5                  | Full-stack type safety                              |
| **Styling**    | Tailwind CSS 4                | Utility-first responsive dark/light UI              |
| **Auth**       | Firebase Auth + NextAuth 5    | Email/Google (Firebase) + GitHub OAuth (NextAuth)   |
| **Database**   | Neon PostgreSQL (serverless)  | All user data, logs, test results, reports          |
| **Sandboxes**  | E2B                           | Isolated Linux microVMs per deployment              |
| **Workflows**  | Inngest                       | Durable background functions for long-running scans |
| **AI**         | Groq (`llama-3.1-8b-instant`) | Payload augmentation + vulnerability analysis       |
| **Streaming**  | Web Streams API (SSE)         | Real-time log delivery to browser                   |
| **Encryption** | Node.js `crypto` AES-256-GCM  | Env var encryption at rest with random IV           |
| **Icons**      | Lucide React                  | Consistent icon library across all UI               |

---

## 🖥️ Console Dashboard

### Sidebar Navigation

```
Console
├── Overview              — Active deployments summary, quick stats
├── Testing
│   ├── Security          — Playwright security checks + Inngest AI agent
│   ├── E2E Tests         — Browser automation end-to-end tests
│   ├── API Testing       — HTTP request builder and tester
│   ├── Load Testing      — Concurrent user performance benchmarking
│   ├── Visual Testing    — Screenshot capture and visual diff
│   └── Attack Pipeline   — Full AI-assisted penetration test pipeline
└── Settings
    ├── Repositories      — GitHub repository browser (card + table view)
    ├── Deployments       — All deployments with logs and status
    ├── Secrets           — Encrypted environment variable manager
    └── Billing           — Plan selection (Free / Pro / Enterprise)
```

---

## 🗃️ Database Schema

All tables are created automatically on first request via `ensureTables()` in `lib/db.ts`.  
**Current schema version: 4**

### `deployments`

```sql
id           TEXT PRIMARY KEY,
user_id      TEXT NOT NULL,
repo_name    TEXT,
repo_url     TEXT,
branch       TEXT,
sandbox_id   TEXT,
public_url   TEXT,
status       TEXT,           -- deploying | live | failed | terminated
created_at   BIGINT,
updated_at   BIGINT,
framework    TEXT,
error        TEXT
```

### `deployment_logs`

```sql
id           BIGSERIAL PRIMARY KEY,
sandbox_id   TEXT NOT NULL,
ts           BIGINT NOT NULL,
level        TEXT NOT NULL,   -- info | error
msg          TEXT NOT NULL
```

### `secrets`

```sql
id           TEXT PRIMARY KEY,
user_id      TEXT NOT NULL,
sandbox_id   TEXT NOT NULL,
key          TEXT NOT NULL,
value        TEXT NOT NULL,   -- AES-256-GCM: "iv:tag:ciphertext" (hex)
created_at   BIGINT
```

### `run_logs`

```sql
id           TEXT PRIMARY KEY,
user_id      TEXT NOT NULL DEFAULT '',
sandbox_id   TEXT NOT NULL,
test_type    TEXT NOT NULL,
status       TEXT NOT NULL,   -- running | completed | failed | stopped
created_at   BIGINT NOT NULL,
finished_at  BIGINT,
result_json  TEXT             -- full test result serialized as JSON
```

### `attack_pipeline_runs`

```sql
id              TEXT PRIMARY KEY,
user_id         TEXT NOT NULL DEFAULT '',
base_url        TEXT NOT NULL,
sandbox_id      TEXT,
status          TEXT NOT NULL DEFAULT 'running',  -- running | completed | failed | stopped
created_at      BIGINT NOT NULL,
finished_at     BIGINT,
routes_found    INT DEFAULT 0,
overall_score   INT,                -- 0–100 security score
risk_level      TEXT,               -- Minimal | Low | Medium | High | Critical
critical_count  INT DEFAULT 0,
high_count      INT DEFAULT 0,
medium_count    INT DEFAULT 0,
low_count       INT DEFAULT 0,
passed_count    INT DEFAULT 0,
summary         TEXT,               -- AI-generated one-liner summary
report_json     TEXT                -- full VulnerabilityReport as JSON
```

---

## 📡 API Reference

### Deployments

| Method   | Endpoint                      | Description                          |
| -------- | ----------------------------- | ------------------------------------ |
| `GET`    | `/api/deploy`                 | List user's deployments              |
| `POST`   | `/api/deploy`                 | Create new deployment from Git URL   |
| `DELETE` | `/api/deploy/[id]`            | Stop and remove deployment + sandbox |
| `GET`    | `/api/deploy/logs?sandboxId=` | Get logs for a deployment            |

### Repositories

| Method | Endpoint     | Description                              |
| ------ | ------------ | ---------------------------------------- |
| `GET`  | `/api/repos` | List GitHub repos for authenticated user |

### Secrets (Encrypted Env Vars)

| Method   | Endpoint                  | Description                 |
| -------- | ------------------------- | --------------------------- |
| `GET`    | `/api/secrets?sandboxId=` | List secrets for a sandbox  |
| `POST`   | `/api/secrets`            | Create and encrypt a secret |
| `PUT`    | `/api/secrets/[id]`       | Update secret value         |
| `DELETE` | `/api/secrets/[id]`       | Delete a secret             |

### Security Testing (Inngest)

| Method | Endpoint                  | Description                                  |
| ------ | ------------------------- | -------------------------------------------- |
| `POST` | `/api/security-agent/run` | Trigger Inngest security scan workflow       |
| `GET`  | `/api/tests/run`          | List test runs for current user              |
| `POST` | `/api/tests/run`          | Start a test run (E2E / load / visual / API) |
| `POST` | `/api/tests/stop`         | Stop an in-progress test run                 |

### Attack Pipeline

| Method  | Endpoint                                   | Description                                              |
| ------- | ------------------------------------------ | -------------------------------------------------------- |
| `POST`  | `/api/attack-pipeline`                     | Start scan — returns `text/event-stream` SSE response    |
| `GET`   | `/api/attack-pipeline`                     | List user's attack pipeline runs (last 30, newest first) |
| `PATCH` | `/api/attack-pipeline`                     | Stop a running scan: `{ runId: "ap_..." }`               |
| `GET`   | `/api/attack-pipeline/report?runId=ap_...` | Fetch full `VulnerabilityReport` JSON for a run          |

#### Request Body (POST `/api/attack-pipeline`)

```jsonc
{
  "baseUrl": "https://my-app.example.com", // required
  "sandboxId": "sandbox_abc", // optional, associates run with deployment
  "useAi": true, // enable Groq AI analysis
  "includePerformance": false, // enable load test
}
```

---

## 🔐 Environment Variables

```bash
# ── Authentication ────────────────────────────────────────────────
NEXTAUTH_SECRET=          # Random 32+ char secret for NextAuth JWT signing
NEXTAUTH_URL=             # App base URL (e.g. http://localhost:3000)

# GitHub OAuth (NextAuth provider)
GITHUB_CLIENT_ID=         # GitHub OAuth App client ID
GITHUB_CLIENT_SECRET=     # GitHub OAuth App client secret

# Firebase (Email / Google auth)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ── Database ──────────────────────────────────────────────────────
DATABASE_URL=             # Neon PostgreSQL pooled connection string

# ── E2B (Sandbox runtime) ─────────────────────────────────────────
E2B_API_KEY=              # E2B API key for creating/managing sandboxes

# ── Inngest (Workflow engine) ─────────────────────────────────────
INNGEST_EVENT_KEY=        # Inngest event signing key
INNGEST_SIGNING_KEY=      # Inngest webhook signing key

# ── AI (Attack Pipeline) ─────────────────────────────────────────
GROQ_API_KEY=             # Groq API key for llama-3.1-8b-instant

# ── Encryption ───────────────────────────────────────────────────
ENCRYPTION_KEY=           # 32-byte hex string (64 hex chars) for AES-256-GCM
```

---

## 📦 Custom Runtime Template

SecDev uses a custom E2B sandbox template (`secdev-web-runtime`) pre-installed with:

- **Node.js 20 LTS** with npm, yarn, pnpm
- **Playwright** with Chromium browser for automated tests
- **Git**, curl, wget, python3 for build tools
- Pre-warmed dependency cache to speed up installs

**Template location:** `templates/web-runtime/`

**Build and publish the template:**

```bash
cd templates/web-runtime
e2b template build --name secdev-web-runtime
```

---

## 🚀 Installation Guide

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- Neon PostgreSQL database (free tier works)
- E2B account + API key
- GitHub OAuth App (for repo access)
- Firebase project (for email / Google auth)
- Groq API key (for AI features — free tier available)
- Inngest account (for background workflows — free tier available)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/secdev.git
cd secdev

# 2. Install dependencies
pnpm install

# 3. Copy and fill environment variables
cp .env.example .env
# Edit .env with your keys

# 4. Start development server
pnpm dev

# 5. Start Inngest dev server (separate terminal)
npx inngest-cli@latest dev
```

### Production Build

```bash
pnpm build
pnpm start
```

---

## 🗺️ Project File Structure

```
secdev/
├── app/
│   ├── page.tsx                      Landing / marketing page
│   ├── login/page.tsx                Firebase email/Google login
│   ├── register/page.tsx             Firebase registration
│   ├── globals.css                   Global styles
│   └── console/
│       ├── layout.tsx                Console shell (sidebar + top bar)
│       ├── page.tsx                  Overview dashboard
│       ├── deployments/page.tsx      Deployment management
│       ├── repositories/page.tsx     GitHub repo browser
│       ├── security/page.tsx         Security scans + AI agent tabs
│       ├── security-agent/page.tsx   Redirects to /console/security
│       ├── e2e/page.tsx              End-to-end test runner
│       ├── api-testing/page.tsx      API request builder
│       ├── load/page.tsx             Load / performance test runner
│       ├── visual/page.tsx           Visual / screenshot tester
│       ├── attack-pipeline/page.tsx  ← Attack pipeline UI (full pen-test)
│       ├── secrets/page.tsx          Encrypted env var manager
│       └── billing/page.tsx          Plan management
│
├── app/api/
│   ├── auth/[...nextauth]/          NextAuth route handler
│   ├── deploy/                      Deployment CRUD + log streaming
│   ├── repos/                       GitHub repos endpoint
│   ├── secrets/                     Encrypted secrets CRUD
│   ├── security-agent/run/          Inngest security scan trigger
│   ├── tests/run/                   Generic test runner
│   ├── tests/stop/                  Stop a running test
│   └── attack-pipeline/
│       ├── route.ts                 POST (start scan SSE) / GET (list) / PATCH (stop)
│       └── report/route.ts          GET full report by runId
│
├── components/
│   └── console/
│       ├── sidebar.tsx              Sidebar nav (all routes + icons)
│       ├── repository-card.tsx      Repo card component
│       └── repository-table.tsx     Repo table component
│
├── lib/
│   ├── auth.ts                      NextAuth config (GitHub provider)
│   ├── db.ts                        Neon DB client + ensureTables() (schema v4)
│   ├── crypto.ts                    AES-256-GCM encrypt/decrypt helpers
│   └── attack-pipeline/             ← Modular pen-test engine
│       ├── pipeline/runScan.ts      Entry point: orchestrates all 4 steps
│       ├── agents/
│       │   ├── sqlInjectionAgent.ts
│       │   ├── authBypassAgent.ts
│       │   ├── injectionAgent.ts
│       │   ├── parameterAgent.ts
│       │   └── orchestrator.ts
│       ├── scanners/
│       │   ├── securityScanner.ts
│       │   └── performanceScanner.ts
│       ├── parsers/
│       │   └── routeParser.ts
│       └── utils/
│           ├── httpClient.ts
│           └── payloadGenerator.ts
│
├── inngest/                          Inngest function definitions
├── templates/web-runtime/            E2B custom sandbox template
├── public/                           Static assets
├── next.config.ts                    Next.js config
├── tsconfig.json                     TypeScript config
└── eslint.config.mjs                 ESLint config
```

---

## 🛡️ Security Architecture Highlights

| Concern                 | Implementation                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| **Sandbox isolation**   | Every deployment gets its own E2B microVM — code cannot escape or reach other users                 |
| **Secret encryption**   | AES-256-GCM with a fresh random IV per value — DB breach does not expose secrets                    |
| **Multi-tenancy**       | Every API route checks `session.user.id`; all DB queries filter by `user_id`                        |
| **URL validation**      | Attack pipeline validates `^https?://` before issuing any HTTP requests                             |
| **Auth on every route** | Every API handler returns 401 before any logic if session is missing                                |
| **Attack scope**        | Penetration tests only run against explicitly provided target URLs                                  |
| **Stop support**        | Client can abort SSE stream anytime; PATCH endpoint marks the run as `stopped` in DB                |
| **OWASP mitigations**   | Parameterized SQL via tagged template literals (Neon) prevents SQL injection in the platform itself |

---

## 📊 Scoring Model (Attack Pipeline)

The overall security score (0–100) is computed by the `securityScanner`:

```
base_score = 100

Deductions per finding:
  critical → -20
  high     → -10
  medium   →  -5
  low      →  -2

Score is clamped to minimum 0.

Risk level bands:
  ≥ 85  →  Minimal
  ≥ 65  →  Low
  ≥ 45  →  Medium
  ≥ 25  →  High
   < 25  →  Critical
```

The score is:

- Displayed in the SVG arc gauge on the report page
- Stored in `attack_pipeline_runs.overall_score`
- Shown as a colored number in the history list
- Used to determine the risk level badge color

---

_Built with Next.js · E2B · Neon PostgreSQL · Inngest · Groq · TypeScript_
