import { NextResponse } from "next/server";
import { startDeployment, getAllDeployments } from "@/lib/deployer";
import { getEnvVars } from "@/lib/env-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repo_name, repo_url, branch } = body;

    const targetUrl: string = repo_url ?? body.repoUrl;
    if (!targetUrl) {
      return NextResponse.json({ error: "repo_url required" }, { status: 400 });
    }

    // Load saved env vars for this repo if any
    const savedEnvVars = repo_name ? await getEnvVars(repo_name) : {};

    const result = await startDeployment(targetUrl, {
      branch: branch ?? "main",
      repoName: repo_name ?? undefined,
      envVars: Object.keys(savedEnvVars).length > 0 ? savedEnvVars : undefined,
    });

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

/** Returns all deployments from the database. */
export async function GET() {
  try {
    const deployments = (await getAllDeployments()).map((d) => ({
      sandboxId: d.sandboxId,
      repoName: d.repoName,
      repoUrl: d.repoUrl,
      branch: d.branch,
      publicUrl: d.publicUrl,
      status: d.status,
      startedAt: d.startedAt,
      logCount: d.logCount ?? d.logs.length,
    }));
    return NextResponse.json({ ok: true, deployments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
