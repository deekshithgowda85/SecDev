#!/bin/bash
set -e

cd /home/user/app

# Clone the repository if REPO_URL is set
if [ -n "$REPO_URL" ]; then
  BRANCH="${BRANCH:-main}"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" repo
  cd repo
fi

# Detect package manager
if [ -f "pnpm-lock.yaml" ]; then
  PKG="pnpm"
elif [ -f "yarn.lock" ]; then
  PKG="yarn"
else
  PKG="npm"
fi

# Install dependencies
if [ -f "package.json" ]; then
  $PKG install
fi

# Detect framework and start
if [ -f "next.config.js" ] || [ -f "next.config.ts" ] || [ -f "next.config.mjs" ]; then
  # Next.js project
  $PKG run build
  PORT=3000 $PKG run start
elif grep -q '"dev"' package.json 2>/dev/null && (grep -q "vite" package.json 2>/dev/null || grep -q "react-scripts" package.json 2>/dev/null); then
  # Vite or CRA project — build and serve static output
  $PKG run build
  DIST_DIR="dist"
  [ -d "build" ] && DIST_DIR="build"
  serve -s "$DIST_DIR" -l 3000
elif [ -f "index.html" ]; then
  # Static HTML
  serve -s . -l 3000
else
  # Fallback: try npm start or serve current directory
  if grep -q '"start"' package.json 2>/dev/null; then
    PORT=3000 $PKG run start
  else
    serve -s . -l 3000
  fi
fi
