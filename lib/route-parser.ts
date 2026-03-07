/**
 * Route Parser — auto-discovers application routes from a deployed E2B sandbox.
 *
 * Supports:
 *  - Next.js App Router (page.tsx files under /app)
 *  - Next.js Pages Router (files under /pages)
 *  - React Router (scans src/ for Route definitions)
 *  - Static HTML (*.html files)
 *
 * Connects to a running sandbox via E2B SDK, inspects the file tree,
 * and returns a sorted list of route paths.
 */

import { Sandbox } from "e2b";

const PROJECT_ROOT = "/home/user/repo";

export interface ParsedRoutes {
  routes: string[];
  framework: "nextjs-app" | "nextjs-pages" | "react-router" | "static" | "unknown";
}

/**
 * Connect to a live sandbox and discover all routes.
 */
export async function parseRoutes(sandboxId: string): Promise<ParsedRoutes> {
  const sandbox = await Sandbox.connect(sandboxId, {
    apiKey: process.env.E2B_API_KEY,
  });

  // Detect framework by checking for characteristic directories/files
  const detect = await sandbox.commands.run(
    `ls ${PROJECT_ROOT}/app 2>/dev/null && echo HAS_APP; ` +
    `ls ${PROJECT_ROOT}/pages 2>/dev/null && echo HAS_PAGES; ` +
    `ls ${PROJECT_ROOT}/src 2>/dev/null && echo HAS_SRC; ` +
    `ls ${PROJECT_ROOT}/public 2>/dev/null && echo HAS_PUBLIC; ` +
    `ls ${PROJECT_ROOT}/*.html 2>/dev/null && echo HAS_HTML`,
    { timeoutMs: 10_000 }
  );
  const out = detect.stdout;

  // ── Next.js App Router ──────────────────────────────────────────────────
  if (out.includes("HAS_APP")) {
    const result = await sandbox.commands.run(
      `find ${PROJECT_ROOT}/app -name 'page.tsx' -o -name 'page.jsx' -o -name 'page.ts' -o -name 'page.js' 2>/dev/null | sort`,
      { timeoutMs: 15_000 }
    );
    const routes = result.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((f) => {
        // /home/user/repo/app/dashboard/settings/page.tsx → /dashboard/settings
        let route = f
          .replace(`${PROJECT_ROOT}/app`, "")
          .replace(/\/page\.(tsx|jsx|ts|js)$/, "");
        if (route === "") route = "/";
        // Skip route groups like (auth) and dynamic segments display
        route = route.replace(/\/\([^)]+\)/g, "");
        return route || "/";
      });
    return { routes: [...new Set(routes)].sort(), framework: "nextjs-app" };
  }

  // ── Next.js Pages Router ────────────────────────────────────────────────
  if (out.includes("HAS_PAGES")) {
    const result = await sandbox.commands.run(
      `find ${PROJECT_ROOT}/pages -name '*.tsx' -o -name '*.jsx' -o -name '*.ts' -o -name '*.js' 2>/dev/null | grep -v '_app' | grep -v '_document' | grep -v 'api/' | sort`,
      { timeoutMs: 15_000 }
    );
    const routes = result.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((f) => {
        let route = f
          .replace(`${PROJECT_ROOT}/pages`, "")
          .replace(/\.(tsx|jsx|ts|js)$/, "");
        if (route === "/index") route = "/";
        route = route.replace(/\/index$/, "");
        return route || "/";
      });
    return { routes: [...new Set(routes)].sort(), framework: "nextjs-pages" };
  }

  // ── React Router (scan src for Route patterns) ──────────────────────────
  if (out.includes("HAS_SRC")) {
    const result = await sandbox.commands.run(
      `grep -roh 'path=["'"'"'][^"'"'"']*["'"'"']' ${PROJECT_ROOT}/src/ 2>/dev/null | sed 's/path=["'"'"']//;s/["'"'"']//' | sort -u`,
      { timeoutMs: 15_000 }
    );
    const routes = result.stdout.trim().split("\n").filter(Boolean);
    if (routes.length > 0) {
      return { routes, framework: "react-router" };
    }
  }

  // ── Static HTML ─────────────────────────────────────────────────────────
  const htmlResult = await sandbox.commands.run(
    `find ${PROJECT_ROOT} -maxdepth 3 -name '*.html' ! -path '*/node_modules/*' 2>/dev/null | sort`,
    { timeoutMs: 15_000 }
  );
  const htmlFiles = htmlResult.stdout.trim().split("\n").filter(Boolean);
  if (htmlFiles.length > 0) {
    const routes = htmlFiles.map((f) => {
      let route = f.replace(PROJECT_ROOT, "");
      if (route === "/index.html") route = "/";
      return route;
    });
    return { routes, framework: "static" };
  }

  // Fallback — just return root
  return { routes: ["/"], framework: "unknown" };
}

/**
 * Discover API routes from a Next.js project in the sandbox.
 */
export async function parseApiRoutes(sandboxId: string): Promise<string[]> {
  const sandbox = await Sandbox.connect(sandboxId, {
    apiKey: process.env.E2B_API_KEY,
  });

  // Next.js App Router API routes
  const appApi = await sandbox.commands.run(
    `find ${PROJECT_ROOT}/app -name 'route.ts' -o -name 'route.js' 2>/dev/null | sort`,
    { timeoutMs: 15_000 }
  );
  if (appApi.stdout.trim()) {
    return appApi.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((f) => {
        return f
          .replace(`${PROJECT_ROOT}/app`, "")
          .replace(/\/route\.(ts|js)$/, "")
          .replace(/\/\([^)]+\)/g, "") || "/api";
      });
  }

  // Next.js Pages Router API routes
  const pagesApi = await sandbox.commands.run(
    `find ${PROJECT_ROOT}/pages/api -name '*.ts' -o -name '*.js' 2>/dev/null | sort`,
    { timeoutMs: 15_000 }
  );
  if (pagesApi.stdout.trim()) {
    return pagesApi.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((f) => {
        return f
          .replace(`${PROJECT_ROOT}/pages`, "")
          .replace(/\.(ts|js)$/, "")
          .replace(/\/index$/, "");
      });
  }

  return [];
}
