# SecDev

A self-hosted deployment platform that runs isolated preview environments inside [E2B](https://e2b.dev) sandboxes. Deploy any Git repository — it clones, installs dependencies, and serves the app inside a sandboxed container with a public URL on your own domain.

## Features

- **Instant deploys** — Clone any Git repo, detect the framework, and serve a live preview in ~30 s
- **E2B sandboxes** — Each deployment gets a fully isolated Linux container (2 vCPU, 1 GB RAM, 1 hr timeout)
- **Framework auto-detection** — Next.js (dev mode), Vite, CRA, Express, or static HTML
- **Memory-safe** — Next.js runs `next dev` instead of `next build` to fit within 1 GB RAM
- **Encrypted env vars** — Per-project secrets stored with AES-256-GCM in Neon PostgreSQL
- **Sandbox Manager** — View all active sandboxes, running time, and kill any of them
- **Live log viewer** — Streaming build + server logs with auto-scroll

## Stack

| Layer           | Technology                          |
| --------------- | ----------------------------------- |
| Framework       | Next.js 16 (App Router, React 19)   |
| Sandbox runtime | E2B (`secdev-web-runtime` template) |
| Database        | Neon PostgreSQL (serverless)        |
| Styling         | Tailwind CSS v4                     |
| Auth            | Firebase Auth                       |

## Quick Start

> Requires Node.js 20+ and npm 10+.  
> To update npm: `npm install -g npm@11.11.0`

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## Environment Variables

Create a `.env` file in the project root:

```env
# E2B sandbox API
E2B_API_KEY=e2b_...
E2B_TEMPLATE=secdev-web-runtime

# Neon PostgreSQL (used for encrypted env var storage)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Firebase Auth
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Framework Support (inside 1 GB sandbox)

| Framework                   | RAM usage     | Notes                             |
| --------------------------- | ------------- | --------------------------------- |
| Express / Fastify           | ~50 MB        | Best fit — instant start          |
| Static HTML + `serve`       | ~10 MB        | Zero build step                   |
| Vite (React / Vue / Svelte) | ~400 MB build | Fast build, light runtime         |
| SvelteKit                   | ~200 MB build | Much lighter than Next.js         |
| **Next.js**                 | ~450 MB       | Runs `next dev` (no build step)   |
| Astro (static)              | ~200 MB build | Great for content sites           |
| ❌ Next.js `next build`     | 1.5–2 GB      | OOM crash — avoided automatically |
| ❌ Remix prod build         | ~1.5 GB       | Same issue                        |

## E2B Template

The custom E2B template `secdev-web-runtime` has Node 20, pnpm, git, and `serve` pre-installed. Build and push it from `templates/web-runtime/`:

```bash
cd templates/web-runtime
e2b template build --name secdev-web-runtime
```

## Key Files

```
lib/deployer.ts                         — Clone, detect framework, start server, stream logs
lib/env-store.ts                        — AES-256-GCM encrypted env vars in Neon PostgreSQL
app/api/deploy/route.ts                 — POST start deployment, GET list all
app/api/deploy/[id]/route.ts            — GET record + logs, DELETE kill
app/api/sandboxes/route.ts              — GET all live E2B sandboxes, DELETE kill
app/console/deployments/                — Deployment list + live log viewer
app/console/sandboxes/                  — Sandbox Manager (status, kill, framework guide)
app/console/env/                        — Per-project env var CRUD
templates/web-runtime/                  — E2B template Dockerfile
```

NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...

````

Run locally:

```bash
npm install
npm run dev
````

Next steps:

- Integrate real E2B sandbox API: create sandboxes, clone repos, run builds and expose public URLs.
- Add Inngest workflows for async job orchestration and test execution.
- Harden authentication (verify ID tokens on server routes) and add GitHub OAuth.
