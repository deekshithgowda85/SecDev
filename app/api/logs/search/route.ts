/**
 * app/api/logs/search/route.ts
 *
 * GET  /api/logs/search?q=<query>[&sandboxId=<id>][&limit=<n>]
 *   Returns semantically similar log chunks for the authenticated user.
 *
 * POST /api/logs/search
 *   Body: { q: string; sandboxId?: string; limit?: number }
 *   Same as GET but accepts a JSON body (useful for longer queries).
 *
 * POST /api/logs/search?action=trigger
 *   Body: { sandboxId: string; ttlDays?: number }
 *   Manually trigger indexing for a sandbox (fires the Inngest event).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchLogVectors } from "@/lib/db";
import { inngest } from "@/lib/inngest";
import { embedQuery } from "@/lib/vector-indexer";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitiseLimit(raw: string | null | undefined): number {
  const n = parseInt(raw ?? "10", 10);
  if (isNaN(n) || n < 1) return 10;
  if (n > 50) return 50;
  return n;
}

// ── Shared search handler ─────────────────────────────────────────────────────

async function handleSearch(opts: {
  userId: string;
  query: string;
  sandboxId?: string;
  limit: number;
}) {
  const { userId, query, sandboxId, limit } = opts;

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  // Embed the user's natural-language query using Cohere
  const queryEmbedding = await embedQuery(query.trim());

  // Run the cosine-similarity search
  const results = await searchLogVectors({
    userId,
    queryEmbedding,
    sandboxId,
    limit,
  });

  return NextResponse.json({
    query,
    sandboxId: sandboxId ?? null,
    count: results.length,
    results: results.map((r) => ({
      id: r.id,
      sandboxId: r.sandboxId,
      logIdRange: { start: r.logIdStart, end: r.logIdEnd },
      chunkText: r.chunkText,
      createdAt: r.createdAt,
    })),
  });
}

// ── GET /api/logs/search ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const sandboxId = searchParams.get("sandboxId") ?? undefined;
  const limit = sanitiseLimit(searchParams.get("limit"));

  try {
    return await handleSearch({ userId: session.user.id, query, sandboxId, limit });
  } catch (err) {
    console.error("[logs/search] GET error:", err);
    return NextResponse.json(
      { error: "Search failed", detail: String(err) },
      { status: 500 }
    );
  }
}

// ── POST /api/logs/search ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Handle manual index trigger via ?action=trigger
  const { searchParams } = new URL(req.url);
  if (searchParams.get("action") === "trigger") {
    return handleTrigger(req, session.user.id);
  }

  let body: { q?: string; sandboxId?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = body.q ?? "";
  const sandboxId = body.sandboxId ?? undefined;
  const limit = sanitiseLimit(String(body.limit ?? 10));

  try {
    return await handleSearch({ userId: session.user.id, query, sandboxId, limit });
  } catch (err) {
    console.error("[logs/search] POST error:", err);
    return NextResponse.json(
      { error: "Search failed", detail: String(err) },
      { status: 500 }
    );
  }
}

// ── Manual index trigger ──────────────────────────────────────────────────────

async function handleTrigger(req: NextRequest, userId: string) {
  let body: { sandboxId?: string; ttlDays?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sandboxId, ttlDays = 30 } = body;
  if (!sandboxId) {
    return NextResponse.json(
      { error: "sandboxId is required" },
      { status: 400 }
    );
  }

  await inngest.send({
    name: "log/index.requested",
    data: { sandboxId, userId, ttlDays },
  });

  return NextResponse.json({
    ok: true,
    message: `Indexing triggered for sandbox ${sandboxId}`,
  });
}