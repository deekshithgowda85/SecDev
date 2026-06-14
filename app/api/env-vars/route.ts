import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, ensureTables } from "@/lib/db";
import {
  getEnvVars,
  listEnvVars,
  setEnvVar,
  deleteEnvVar,
} from "@/lib/env-store";

/** Returns true if userId owns at least one deployment for the given repoName. */
async function userOwnsProject(userId: string, project: string): Promise<boolean> {
  await ensureTables();
  const sql = getDb();
  const rows = await sql`
    SELECT 1 FROM deployments
    WHERE user_id = ${userId} AND repo_name = ${project}
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * GET /api/env-vars?project=<repoName>&reveal=1
 *   reveal=1 → returns plaintext values (admin use only)
 *   otherwise → returns masked values
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");
    const reveal = searchParams.get("reveal") === "1";

    if (!project) {
      return NextResponse.json({ error: "project query param required" }, { status: 400 });
    }

    if (!(await userOwnsProject(session.user.id, project))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (reveal) {
      const vars = await getEnvVars(project);
      return NextResponse.json({
        ok: true,
        vars: Object.entries(vars).map(([key, value]) => ({ key, value })),
      });
    }

    const masked = await listEnvVars(project);
    return NextResponse.json({ ok: true, vars: masked });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/env-vars
 * Body: { project: string; key: string; value: string }
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { project, key, value } = body;

    if (!project || !key || value === undefined) {
      return NextResponse.json(
        { error: "project, key and value are required" },
        { status: 400 }
      );
    }

    if (!(await userOwnsProject(session.user.id, project))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Basic key validation — only allow safe env var names
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      return NextResponse.json(
        { error: "key must be a valid env var name (letters, numbers, underscores)" },
        { status: 400 }
      );
    }

    await setEnvVar(project, key, String(value));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/env-vars
 * Body: { project: string; key: string }
 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { project, key } = body;

    if (!project || !key) {
      return NextResponse.json({ error: "project and key are required" }, { status: 400 });
    }

    if (!(await userOwnsProject(session.user.id, project))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteEnvVar(project, key);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
