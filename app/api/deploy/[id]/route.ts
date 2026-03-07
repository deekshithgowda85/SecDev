import { NextResponse } from "next/server";
import { killSandbox, getDeployment, deleteDeployment, startDeployment, refreshSandboxStatus } from "@/lib/deployer";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const record = await getDeployment(id);
  if (!record) {
    return NextResponse.json({ ok: false, error: "Deployment not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    deployment: {
      sandboxId: record.sandboxId,
      repoName: record.repoName,
      repoUrl: record.repoUrl,
      branch: record.branch,
      publicUrl: record.publicUrl,
      status: record.status,
      startedAt: record.startedAt,
      logs: record.logs,
    },
  });
}

/** Redeploy: create a fresh sandbox from the same repo/branch. */
export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const record = await getDeployment(id);
    if (!record) {
      return NextResponse.json({ ok: false, error: "Deployment not found" }, { status: 404 });
    }
    const result = await startDeployment(record.repoUrl, {
      branch: record.branch,
      repoName: record.repoName,
    });
    return NextResponse.json({ ok: true, deployment: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Check if the sandbox is still alive; updates DB status and returns it. */
export async function PATCH(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const record = await getDeployment(id);
    if (!record) {
      return NextResponse.json({ ok: false, error: "Deployment not found" }, { status: 404 });
    }
    // Only worth checking if DB thinks it's live
    if (record.status !== "live") {
      return NextResponse.json({ ok: true, status: record.status });
    }
    const status = await refreshSandboxStatus(id);
    return NextResponse.json({ ok: true, status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    await killSandbox(id).catch(() => null);
    await deleteDeployment(id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
