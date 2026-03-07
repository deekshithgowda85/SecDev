import { NextResponse } from "next/server";
import { startDeployment, listSandboxes } from "@/lib/deployer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repo_name, repo_url, branch } = body;

    // Support both old (repoUrl) and new field names
    const targetUrl: string = repo_url ?? body.repoUrl;
    if (!targetUrl) {
      return NextResponse.json({ error: "repo_url required" }, { status: 400 });
    }

    const result = await startDeployment(targetUrl, { branch: branch ?? "main" });

    return NextResponse.json({
      ok: true,
      deployment: {
        ...result,
        repo_name: repo_name ?? null,
        repo_url: targetUrl,
        branch: branch ?? "main",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sandboxes = await listSandboxes();
    return NextResponse.json({ ok: true, sandboxes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
