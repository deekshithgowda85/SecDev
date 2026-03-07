import { NextResponse } from "next/server";
import {
  getEnvVars,
  listEnvVars,
  setEnvVar,
  deleteEnvVar,
} from "@/lib/env-store";

/**
 * GET /api/env-vars?project=<repoName>&reveal=1
 *   reveal=1 → returns plaintext values (admin use only)
 *   otherwise → returns masked values
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");
    const reveal = searchParams.get("reveal") === "1";

    if (!project) {
      return NextResponse.json({ error: "project query param required" }, { status: 400 });
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
  try {
    const body = await request.json();
    const { project, key, value } = body;

    if (!project || !key || value === undefined) {
      return NextResponse.json(
        { error: "project, key and value are required" },
        { status: 400 }
      );
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
  try {
    const body = await request.json();
    const { project, key } = body;

    if (!project || !key) {
      return NextResponse.json({ error: "project and key are required" }, { status: 400 });
    }

    await deleteEnvVar(project, key);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
