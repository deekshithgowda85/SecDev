import { NextResponse } from "next/server";
import { killSandbox, getDeployment, deleteDeployment, startDeployment, refreshSandboxStatus } from "@/lib/deployer";
import { auth } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

/** Helper: fetch deployment and verify ownership. Returns error response on failure. */
async function getOwnedDeployment(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };
  }
  const record = await getDeployment(id);
  if (!record) {
    return { error: NextResponse.json({ ok: false, error: "Deployment not found" }, { status: 404 }) };
  }
  if (record.userId && record.userId !== session.user.id) {
    return { error: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }) };
  }
  return { record, userId: session.user.id };
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const result = await getOwnedDeployment(id);
  if (result.error) return result.error;
  const { record } = result;
  return NextResponse.json({
    ok: true,
    deployment: {
      sandboxId: record!.sandboxId,
      repoName: record!.repoName,
      repoUrl: record!.repoUrl,
      branch: record!.branch,
      publicUrl: record!.publicUrl,
      status: record!.status,
      startedAt: record!.startedAt,
      logs: record!.logs,
    },
  });
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await getOwnedDeployment(id);
    if (result.error) return result.error;
    const { record, userId } = result;
    const newDeploy = await startDeployment(record!.repoUrl, {
      branch: record!.branch,
      repoName: record!.repoName,
      userId,
    });
    return NextResponse.json({ ok: true, deployment: newDeploy });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await getOwnedDeployment(id);
    if (result.error) return result.error;
    const { record } = result;
    if (record!.status !== "live") {
      return NextResponse.json({ ok: true, status: record!.status });
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
    const result = await getOwnedDeployment(id);
    if (result.error) return result.error;
    await killSandbox(id).catch(() => null);
    await deleteDeployment(id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}