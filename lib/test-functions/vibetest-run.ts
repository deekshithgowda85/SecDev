import { inngest } from "@/lib/inngest";
import { getDb, ensureTables } from "@/lib/db";
import { Sandbox } from "e2b";
import { getDeployment } from "@/lib/deployer";

// ---------------------------------------------------------------------------
// Playwright agent scripts — run inside E2B sandbox targeting localhost:3000
// Each script outputs one JSON line to stdout:
//   { agent: 'links', results: [...] }  |  { agent: 'a11y', issues: [...] }
// ---------------------------------------------------------------------------

const LINK_SCRIPT = `
const { chromium } = require('/tmp/vt/node_modules/playwright');
(async () => {
  const BASE = process.argv[2] || 'http://localhost:3000';
  const browser = await chromium.launch({ args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const visited = new Set();
  const queue = [BASE];
  const results = [];

  while (queue.length && visited.size < 25) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
      const st = resp ? resp.status() : 0;
      const ok = st >= 200 && st < 400;
      results.push({ url, status: st, ok });
      if (ok && visited.size < 20) {
        const hrefs = await page.evaluate(function(b) {
          return Array.from(document.querySelectorAll('a[href]')).map(function(a) {
            try { return new URL(a.getAttribute('href'), b).href; } catch(_) { return null; }
          }).filter(function(h) { return h && h.startsWith(b) && !h.includes('#') && !h.includes('?'); });
        }, BASE);
        hrefs.forEach(function(h) { if (!visited.has(h)) queue.push(h); });
      }
    } catch(e) {
      results.push({ url, status: 0, ok: false, error: String(e.message).slice(0,150) });
    }
  }
  await browser.close();
  process.stdout.write(JSON.stringify({ agent: 'links', results }) + '\\n');
})().catch(function(e) {
  process.stdout.write(JSON.stringify({ agent: 'links', error: String(e.message), results: [] }) + '\\n');
});
`.trim();

const CONSOLE_SCRIPT = `
const { chromium } = require('/tmp/vt/node_modules/playwright');
(async () => {
  const BASE = process.argv[2] || 'http://localhost:3000';
  const browser = await chromium.launch({ args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  const errors = [];
  const page = await browser.newPage();
  page.on('console', function(msg) {
    if (msg.type() === 'error') errors.push({ url: BASE, type: 'console.error', msg: msg.text().slice(0,300) });
  });
  page.on('pageerror', function(e) {
    errors.push({ url: BASE, type: 'pageerror', msg: e.message.slice(0,300) });
  });
  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
  } catch(_) {}
  await browser.close();
  process.stdout.write(JSON.stringify({ agent: 'console', errors: errors }) + '\\n');
})().catch(function(e) {
  process.stdout.write(JSON.stringify({ agent: 'console', error: String(e.message), errors: [] }) + '\\n');
});
`.trim();

const A11Y_SCRIPT = `
const { chromium } = require('/tmp/vt/node_modules/playwright');
(async () => {
  const BASE = process.argv[2] || 'http://localhost:3000';
  const browser = await chromium.launch({ args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  try { await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 }); } catch(_) {}
  const issues = await page.evaluate(function() {
    var r = [];
    document.querySelectorAll('img').forEach(function(img) {
      if (!img.hasAttribute('alt'))
        r.push({ type: 'img-missing-alt', severity: 'fail', detail: 'Image missing alt attribute: ' + img.src.slice(0,80) });
    });
    document.querySelectorAll('button').forEach(function(btn) {
      var txt = (btn.textContent || '').trim();
      var aria = btn.getAttribute('aria-label') || btn.getAttribute('aria-labelledby') || '';
      if (!txt && !aria)
        r.push({ type: 'button-no-label', severity: 'fail', detail: 'Button has no text or aria-label: ' + btn.outerHTML.slice(0,100) });
    });
    document.querySelectorAll('a').forEach(function(a) {
      var txt = (a.textContent || '').trim();
      var aria = a.getAttribute('aria-label') || '';
      if (!txt && !aria && !a.querySelector('img[alt]'))
        r.push({ type: 'link-no-label', severity: 'warning', detail: 'Link has no accessible text: ' + a.outerHTML.slice(0,100) });
    });
    document.querySelectorAll('input:not([type=hidden]),textarea,select').forEach(function(el) {
      var id = el.id;
      var aria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '';
      if (!aria && !(id && document.querySelector('label[for="' + id + '"]')))
        r.push({ type: 'input-no-label', severity: 'warning', detail: 'Form element missing label: ' + el.outerHTML.slice(0,100) });
    });
    if (!document.documentElement.lang)
      r.push({ type: 'no-lang-attr', severity: 'warning', detail: 'html element missing lang attribute' });
    var hs = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(function(h) { return parseInt(h.tagName[1]); });
    for (var i = 1; i < hs.length; i++) {
      if (hs[i] - hs[i-1] > 1) {
        r.push({ type: 'heading-skip', severity: 'warning', detail: 'Heading level skipped h' + hs[i-1] + ' to h' + hs[i] });
        break;
      }
    }
    if (document.querySelectorAll('h1').length === 0)
      r.push({ type: 'no-h1', severity: 'warning', detail: 'Page has no h1 heading' });
    return r;
  });
  await browser.close();
  process.stdout.write(JSON.stringify({ agent: 'a11y', issues: issues }) + '\\n');
})().catch(function(e) {
  process.stdout.write(JSON.stringify({ agent: 'a11y', error: String(e.message), issues: [] }) + '\\n');
});
`.trim();

const UI_SCRIPT = `
const { chromium } = require('/tmp/vt/node_modules/playwright');
(async () => {
  const BASE = process.argv[2] || 'http://localhost:3000';
  const browser = await chromium.launch({ args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try { await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 }); } catch(_) {}
  var issues = await page.evaluate(function() {
    var r = [];
    document.querySelectorAll('img').forEach(function(img) {
      if (img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:'))
        r.push({ type: 'broken-image', severity: 'fail', detail: 'Broken image: ' + img.src.slice(0,100) });
    });
    if (!document.querySelector('meta[name="viewport"]'))
      r.push({ type: 'no-viewport-meta', severity: 'warning', detail: 'Missing <meta name="viewport"> tag' });
    if (!document.title || !document.title.trim())
      r.push({ type: 'no-title', severity: 'warning', detail: 'Page has no title element' });
    if (!document.querySelector('link[rel="icon"],link[rel="shortcut icon"]'))
      r.push({ type: 'no-favicon', severity: 'warning', detail: 'No favicon link tag found' });
    var bodyW = document.body.offsetWidth;
    var overflow = Array.from(document.querySelectorAll('*')).some(function(el) { return el.offsetWidth > bodyW + 5; });
    if (overflow)
      r.push({ type: 'horizontal-overflow-desktop', severity: 'warning', detail: 'Horizontal overflow detected at 1280px viewport' });
    var blocking = Array.from(document.querySelectorAll('script[src]:not([async]):not([defer])')).length;
    if (blocking > 0)
      r.push({ type: 'render-blocking-scripts', severity: 'warning', detail: blocking + ' render-blocking <script> tag(s) — consider defer or async' });
    return r;
  });
  // Check mobile overflow
  await page.setViewportSize({ width: 375, height: 667 });
  try { await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 }); } catch(_) {}
  var mobileIssues = await page.evaluate(function() {
    var r = [];
    var bodyW = document.body.offsetWidth;
    var overflow = Array.from(document.querySelectorAll('*')).some(function(el) { return el.offsetWidth > bodyW + 5; });
    if (overflow)
      r.push({ type: 'mobile-horizontal-overflow', severity: 'fail', detail: 'Horizontal overflow at 375px — layout is not responsive' });
    return r;
  });
  await browser.close();
  process.stdout.write(JSON.stringify({ agent: 'ui', issues: issues.concat(mobileIssues) }) + '\\n');
})().catch(function(e) {
  process.stdout.write(JSON.stringify({ agent: 'ui', error: String(e.message), issues: [] }) + '\\n');
});
`.trim();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAgentOutput(stdout: string, agent: string): Record<string, unknown> {
  const lines = stdout.split("\n").filter((l) => l.trim().startsWith("{"));
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(lines[i]);
    } catch { /* skip */ }
  }
  return { agent, error: "no JSON output", results: [], issues: [], errors: [] };
}

// ---------------------------------------------------------------------------
// Inngest function
// ---------------------------------------------------------------------------

export const runVibetest = inngest.createFunction(
  { id: "vibetest-run", name: "Vibetest Browser Agents" },
  { event: "test/vibetest.run" },
  async ({ event, step }) => {
    const { runId, sandboxId } = event.data as { runId: string; sandboxId: string };
    const sql = getDb();

    // 1. Ensure DB tables exist
    await step.run("ensure-tables", () => ensureTables());

    // 2. Get deployment info (public URL)
    const deployment = await step.run("get-deployment", async () => {
      const d = await getDeployment(sandboxId);
      return d ?? null;
    });

    if (!deployment) {
      await sql`
        UPDATE test_runs SET status='failed', finished_at=${Date.now()},
        summary='Deployment not found' WHERE id=${runId}
      `;
      return { ok: false, reason: "deployment not found" };
    }

    // 3. Install Playwright inside the deployed E2B sandbox
    const installResult = await step.run("setup-playwright", async () => {
      let sandbox: Sandbox | null = null;
      try {
        sandbox = await Sandbox.connect(sandboxId, {
          apiKey: process.env.E2B_API_KEY!,
        });
        const res = await sandbox.commands.run(
          "mkdir -p /tmp/vt && cd /tmp/vt && npm install playwright@latest 2>&1 && /tmp/vt/node_modules/.bin/playwright install chromium --with-deps 2>&1",
          { timeoutMs: 6 * 60 * 1000 }
        );
        return { exitCode: res.exitCode, ok: res.exitCode === 0 };
      } catch (e) {
        return { exitCode: -1, ok: false, error: String((e as Error).message) };
      }
    });

    if (!installResult.ok) {
      const errMsg = "error" in installResult
        ? `Playwright install failed: ${installResult.error}`
        : `Playwright install failed: exit ${installResult.exitCode}`;
      await sql`
        UPDATE test_runs SET status='failed', finished_at=${Date.now()}, summary=${errMsg}
        WHERE id=${runId}
      `;
      return { ok: false, reason: "playwright install failed" };
    }

    // 4. Upload agent scripts and run all 4 agents
    const agentResults = await step.run("run-agents", async () => {
      const sandbox = await Sandbox.connect(sandboxId, {
        apiKey: process.env.E2B_API_KEY!,
      });

      // Write scripts via base64 (avoids any shell quoting issues)
      const scripts = [
        { name: "links.js", src: LINK_SCRIPT },
        { name: "console.js", src: CONSOLE_SCRIPT },
        { name: "a11y.js", src: A11Y_SCRIPT },
        { name: "ui.js", src: UI_SCRIPT },
      ];
      for (const { name, src } of scripts) {
        const b64 = Buffer.from(src).toString("base64");
        await sandbox.commands.run(
          `echo '${b64}' | base64 -d > /tmp/vt/${name}`,
          { timeoutMs: 15_000 }
        );
      }

      // Run agents sequentially, collect JSON output
      const base = "http://localhost:3000";
      const out: Record<string, Record<string, unknown>> = {};
      for (const { name } of scripts) {
        const agent = name.replace(".js", "");
        const res = await sandbox.commands.run(`node /tmp/vt/${name} ${base} 2>&1`, {
          timeoutMs: 3 * 60 * 1000,
        });
        out[agent] = parseAgentOutput(res.stdout, agent);
      }
      return out;
    });

    // 5. Store findings + update run status
    const summary = await step.run("store-results", async () => {
      let totalIssues = 0;
      let fails = 0;

      // --- Link results ---
      const linkData = agentResults["links"] as {
        results?: Array<{ url: string; status: number; ok: boolean; error?: string }>;
      };
      const linkRows = linkData?.results ?? [];
      for (const r of linkRows) {
        const status = r.ok ? "pass" : "fail";
        if (!r.ok) { totalIssues++; fails++; }
        await sql`
          INSERT INTO vibetest_results
            (run_id, sandbox_id, agent, category, status, finding, detail, url, created_at)
          VALUES (
            ${runId}, ${sandboxId}, 'links', 'Link Checker', ${status},
            ${r.ok ? `HTTP ${r.status} OK` : `Broken link (HTTP ${r.status || "0"})`},
            ${r.error ?? `Responded with status ${r.status}`},
            ${r.url}, ${Date.now()}
          )
        `;
      }
      if (linkRows.length === 0) {
        await sql`
          INSERT INTO vibetest_results
            (run_id, sandbox_id, agent, category, status, finding, detail, url, created_at)
          VALUES (${runId}, ${sandboxId}, 'links', 'Link Checker', 'warning',
            'No links checked', 'Page may have no internal links or failed to load', NULL, ${Date.now()})
        `;
      }

      // --- Console errors ---
      const consoleData = agentResults["console"] as {
        errors?: Array<{ url: string; type: string; msg: string }>;
      };
      const consoleErrors = consoleData?.errors ?? [];
      if (consoleErrors.length === 0) {
        await sql`
          INSERT INTO vibetest_results
            (run_id, sandbox_id, agent, category, status, finding, detail, url, created_at)
          VALUES (${runId}, ${sandboxId}, 'console', 'Console Errors', 'pass',
            'No console errors detected', NULL, NULL, ${Date.now()})
        `;
      } else {
        for (const e of consoleErrors) {
          totalIssues++;
          await sql`
            INSERT INTO vibetest_results
              (run_id, sandbox_id, agent, category, status, finding, detail, url, created_at)
            VALUES (
              ${runId}, ${sandboxId}, 'console', 'Console Errors', 'fail',
              ${e.type + ": " + e.msg.slice(0, 80)},
              ${e.msg}, ${e.url ?? null}, ${Date.now()}
            )
          `;
        }
      }

      // --- Accessibility ---
      const a11yData = agentResults["a11y"] as {
        issues?: Array<{ type: string; severity: string; detail: string }>;
      };
      const a11yIssues = a11yData?.issues ?? [];
      for (const issue of a11yIssues) {
        totalIssues++;
        if (issue.severity === "fail") fails++;
        await sql`
          INSERT INTO vibetest_results
            (run_id, sandbox_id, agent, category, status, finding, detail, url, created_at)
          VALUES (
            ${runId}, ${sandboxId}, 'a11y', 'Accessibility',
            ${issue.severity === "fail" ? "fail" : "warning"},
            ${issue.type}, ${issue.detail}, NULL, ${Date.now()}
          )
        `;
      }
      if (a11yIssues.length === 0) {
        await sql`
          INSERT INTO vibetest_results
            (run_id, sandbox_id, agent, category, status, finding, detail, url, created_at)
          VALUES (${runId}, ${sandboxId}, 'a11y', 'Accessibility', 'pass',
            'No accessibility issues found', NULL, NULL, ${Date.now()})
        `;
      }

      // --- UI bugs ---
      const uiData = agentResults["ui"] as {
        issues?: Array<{ type: string; severity: string; detail: string }>;
      };
      const uiIssues = uiData?.issues ?? [];
      for (const issue of uiIssues) {
        totalIssues++;
        if (issue.severity === "fail") fails++;
        await sql`
          INSERT INTO vibetest_results
            (run_id, sandbox_id, agent, category, status, finding, detail, url, created_at)
          VALUES (
            ${runId}, ${sandboxId}, 'ui', 'UI Bugs',
            ${issue.severity === "fail" ? "fail" : "warning"},
            ${issue.type}, ${issue.detail}, NULL, ${Date.now()}
          )
        `;
      }
      if (uiIssues.length === 0) {
        await sql`
          INSERT INTO vibetest_results
            (run_id, sandbox_id, agent, category, status, finding, detail, url, created_at)
          VALUES (${runId}, ${sandboxId}, 'ui', 'UI Bugs', 'pass',
            'No UI issues found', NULL, NULL, ${Date.now()})
        `;
      }

      const summaryText = `Vibetest complete: ${totalIssues} issues found (${fails} failures). `
        + `Checked ${linkRows.length} links, ${consoleErrors.length} console errors, `
        + `${a11yIssues.length} a11y issues, ${uiIssues.length} UI bugs.`;
      await sql`
        UPDATE test_runs SET status='completed', finished_at=${Date.now()}, summary=${summaryText}
        WHERE id=${runId}
      `;
      return summaryText;
    });

    return { ok: true, summary };
  }
);
