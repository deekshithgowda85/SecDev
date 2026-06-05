/**
 * lib/vector-indexer.ts
 *
 * Inngest background function that:
 *  1. Fetches new deployment_logs rows since the last indexed id
 *  2. Chunks them into ~40 line windows
 *  3. Optionally AI-summarises very long chunks (>1500 chars) via Groq
 *  4. Creates Cohere embed-english-v3.0 embeddings (1024-dim, free tier)
 *  5. Stores vectors in deployment_log_vectors
 *  6. Prunes expired rows (retention policy)
 *
 * Trigger events
 * ──────────────
 *   "log/index.requested"
 *     { sandboxId: string; userId: string; ttlDays?: number }
 *     Fire this after a deployment goes live.
 *
 *   "log/index.cron"
 *     {} — re-indexes all recently active sandboxes + runs pruning.
 *     Schedule as a daily cron in the Inngest dashboard: 0 3 * * *
 */

import { inngest } from "@/lib/inngest";
import {
  getDb,
  insertLogVector,
  getLastIndexedLogId,
  pruneExpiredLogVectors,
} from "@/lib/db";
import Groq from "groq-sdk";

// ── Config ────────────────────────────────────────────────────────────────────

/** How many log lines to lump into one chunk before embedding */
const CHUNK_SIZE_LINES = 40;

/** If a chunk's text exceeds this length, summarise with Groq before embedding */
const SUMMARISE_THRESHOLD_CHARS = 1_500;

/** Default retention: 30 days */
const DEFAULT_TTL_DAYS = 30;

/** Max chunks processed per function invocation (rate-limit guard) */
const MAX_CHUNKS_PER_RUN = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCohereApiKey(): string {
  const key = process.env.COHERE_API_KEY;
  if (!key) throw new Error("COHERE_API_KEY env var is not set");
  return key;
}

function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY env var is not set");
  return new Groq({ apiKey });
}

/**
 * Embed an array of texts using Cohere embed-english-v3.0.
 * Returns a 1024-dimensional float array per input text.
 * Uses the fetch API directly — no extra SDK needed.
 */
async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await fetch("https://api.cohere.com/v1/embed", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getCohereApiKey()}`,
      "Content-Type": "application/json",
      "X-Client-Name": "secdev",
    },
    body: JSON.stringify({
      model: "embed-english-v3.0",
      texts,
      input_type: "search_document", // use "search_query" when embedding queries
      truncate: "END",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Cohere embed error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.embeddings as number[][];
}

/**
 * Embed a single search query using Cohere.
 * Uses input_type: "search_query" for better retrieval quality.
 */
export async function embedQuery(query: string): Promise<number[]> {
  const response = await fetch("https://api.cohere.com/v1/embed", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getCohereApiKey()}`,
      "Content-Type": "application/json",
      "X-Client-Name": "secdev",
    },
    body: JSON.stringify({
      model: "embed-english-v3.0",
      texts: [query.slice(0, 2_000)],
      input_type: "search_query",
      truncate: "END",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Cohere embed error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.embeddings[0] as number[];
}

/**
 * Summarise a long log chunk with Groq llama-3.1-8b-instant so the
 * embedding captures semantics rather than noise.
 */
async function summariseChunk(text: string): Promise<string> {
  try {
    const groq = getGroq();
    const chat = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 256,
      messages: [
        {
          role: "system",
          content:
            "You are a concise log analyst. Summarise the following deployment log chunk in 3–5 sentences, focusing on key events, errors, and status changes.",
        },
        { role: "user", content: text },
      ],
    });
    return chat.choices[0]?.message?.content?.trim() ?? text;
  } catch {
    // If summarisation fails, fall back to the raw text
    return text;
  }
}

// ── Row type returned by the DB query ─────────────────────────────────────────

interface LogRow {
  id: string | number;
  msg: string;
  level: string;
  ts: string | number;
}

// ── Core indexing logic ───────────────────────────────────────────────────────

async function indexSandbox(opts: {
  sandboxId: string;
  userId: string;
  ttlDays: number;
}): Promise<{ chunksIndexed: number; pruned: number }> {
  const { sandboxId, userId, ttlDays } = opts;
  const sql = getDb();

  // 1. Find where we left off
  const lastId = await getLastIndexedLogId(sandboxId);

  // 2. Fetch new log lines
  const rows = (await sql`
    SELECT id, msg, level, ts
    FROM   deployment_logs
    WHERE  sandbox_id = ${sandboxId}
      AND  id         > ${lastId}
    ORDER  BY id ASC
    LIMIT  ${CHUNK_SIZE_LINES * MAX_CHUNKS_PER_RUN}
  `) as LogRow[];

  if (rows.length === 0) {
    return { chunksIndexed: 0, pruned: 0 };
  }

  // 3. Slice into chunks of CHUNK_SIZE_LINES
  const chunks: LogRow[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK_SIZE_LINES) {
    chunks.push(rows.slice(i, i + CHUNK_SIZE_LINES));
  }

  // 4. Build text for each chunk (optionally summarise long ones via Groq)
  const chunkTexts: string[] = [];
  const rawTexts: string[] = [];

  for (const chunk of chunks) {
    const rawText = chunk
      .map((r) => `[${r.level.toUpperCase()}] ${r.msg}`)
      .join("\n");
    rawTexts.push(rawText);

    const textToEmbed =
      rawText.length > SUMMARISE_THRESHOLD_CHARS
        ? await summariseChunk(rawText)
        : rawText;
    chunkTexts.push(textToEmbed);
  }

  // 5. Batch embed all chunks in one Cohere API call (more efficient)
  const embeddings = await embedTexts(chunkTexts);

  // 6. Persist each chunk + its embedding
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    await insertLogVector({
      sandboxId,
      userId,
      logIdStart: Number(chunk[0].id),
      logIdEnd: Number(chunk[chunk.length - 1].id),
      chunkText: rawTexts[i],       // always store raw text
      embedding: embeddings[i],
      ttlMs: ttlDays * 24 * 60 * 60 * 1_000,
    });
  }

  // 7. Prune expired rows
  const pruned = await pruneExpiredLogVectors();

  return { chunksIndexed: chunks.length, pruned };
}

// ── Inngest function: on-demand (triggered per deployment) ────────────────────

export const indexDeploymentLogs = inngest.createFunction(
  {
    id: "index-deployment-logs",
    name: "Index deployment logs into pgvector",
    concurrency: { limit: 5 },
    retries: 2,
  },
  { event: "log/index.requested" },
  async ({ event, step }) => {
    const {
      sandboxId,
      userId,
      ttlDays = DEFAULT_TTL_DAYS,
    } = event.data as {
      sandboxId: string;
      userId: string;
      ttlDays?: number;
    };

    const result = await step.run("embed-and-store", () =>
      indexSandbox({ sandboxId, userId, ttlDays })
    );

    return {
      sandboxId,
      chunksIndexed: result.chunksIndexed,
      pruned: result.pruned,
    };
  }
);

// ── Inngest function: scheduled cron re-indexer ───────────────────────────────

export const cronReindexLogs = inngest.createFunction(
  {
    id: "cron-reindex-logs",
    name: "Daily log re-index + retention pruning",
    retries: 1,
  },
  { event: "log/index.cron" },
  async ({ step }) => {
    const sql = getDb();

    // Find all sandboxes with logs updated in the last 7 days
    const activeSandboxes = (await step.run("find-active-sandboxes", () =>
      sql`
        SELECT DISTINCT d.sandbox_id, d.user_id
        FROM   deployments d
        JOIN   deployment_logs l ON l.sandbox_id = d.sandbox_id
        WHERE  l.ts > ${Date.now() - 7 * 24 * 60 * 60 * 1_000}
      `
    )) as { sandbox_id: string; user_id: string }[];

    const results = [];

    for (const { sandbox_id, user_id } of activeSandboxes) {
      const r = await step.run(`index-${sandbox_id}`, () =>
        indexSandbox({
          sandboxId: sandbox_id,
          userId: user_id,
          ttlDays: DEFAULT_TTL_DAYS,
        })
      );
      results.push({ sandboxId: sandbox_id, ...r });
    }

    // Final global prune pass
    const pruned = await step.run("global-prune", () =>
      pruneExpiredLogVectors()
    );

    return { sandboxesProcessed: results.length, globalPruned: pruned, results };
  }
);