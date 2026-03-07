FROM node:20-slim

# ── System packages ────────────────────────────────────────────────────────────
# git, curl: project tooling
# wget, gnupg, ca-certificates: required by Playwright browser install
# procps: provides 'ps' used by health-check scripts
RUN apt-get update && apt-get install -y \
    git curl wget ca-certificates procps \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# ── Global CLI tools ───────────────────────────────────────────────────────────
# pnpm   — fast package manager (used by deployer for pnpm-lock.yaml projects)
# serve  — static file server (used for built SPA/static sites)
# lhci   — Lighthouse CI  (performance / SEO / a11y scoring)
# pa11y  — Accessibility CLI (WCAG checks via headless Chrome)
# artillery — Load testing / HTTP benchmarking
RUN npm install -g \
    pnpm \
    serve \
    @lhci/cli \
    pa11y \
    artillery \
    && npm cache clean --force

# ── Pre-install Playwright + Chromium ─────────────────────────────────────────
# Installed at /opt/playwright so Vibetest agents can skip the 3-5 min runtime
# install step and run tests immediately.
# PLAYWRIGHT_BROWSERS_PATH tells playwright where to find/store browser binaries.
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
RUN mkdir -p /opt/playwright && cd /opt/playwright \
    && npm install playwright@latest \
    && node_modules/.bin/playwright install chromium --with-deps \
    && npm cache clean --force \
    # Make browsers readable by all users inside the sandbox
    && chmod -R a+rx /opt/ms-playwright 2>/dev/null || true

# ── Workspace ─────────────────────────────────────────────────────────────────
RUN mkdir -p /home/user/app
WORKDIR /home/user/app

COPY start.sh /home/user/start.sh
RUN chmod +x /home/user/start.sh
